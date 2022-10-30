#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using System;
using System.Diagnostics;
using System.Threading.Tasks;

namespace GitWebLinks;

public abstract partial class GetLinkCommandBase<T> : BaseCommand<T> where T : GetLinkCommandBase<T>, new() {

    protected enum CommandAction {
        Copy,
        Open
    }


    private GeneralOptionsPage _options = default!; // Initialized immiedately after the command is created.


    protected abstract bool IncludeSelection { get; }


    protected abstract CommandLinkType LinkType { get; }


    protected abstract CommandAction Action { get; }


    protected virtual bool IsVisible(GeneralOptionsPage options) => true;


    protected override Task InitializeCompletedAsync() {
        _options = (GeneralOptionsPage)Package.GetDialogPage(typeof(GeneralOptionsPage));
        return Task.CompletedTask;
    }


    protected override void BeforeQueryStatus(EventArgs e) {
        Command.Visible = IsVisible(_options);
    }


    protected async override Task ExecuteAsync(OleMenuCmdEventArgs e) {
        SolutionItem? resource;
        ResourceInfo? info;
        ILogger logger;


        resource = await VS.Solutions.GetActiveItemAsync();

        if (resource?.FullPath is null) {
            return;
        }

        logger = await Package.GetServiceAsync<ILogger, ILogger>();
        info = await GetResourceInfoAsync(resource.FullPath, logger);

        if (info is not null) {
            SelectedRange? selection = null;


            if (IncludeSelection) {
                DocumentView? documentView;


                // We are allowed to include the selection, but we can only get the
                // selection from the active editor, so we'll only include the selection
                // if the file we are generating the URL for is in the active editor.
                documentView = await VS.Documents.GetActiveDocumentViewAsync();

                if (documentView?.TextView is not null) {
                    if (string.Equals(documentView.FilePath, resource.FullPath, StringComparison.OrdinalIgnoreCase)) {
                        selection = GetLinkCommandBase<T>.GetSelectedRange(documentView.TextView);
                        await logger.LogAsync($"Line selection: {selection}");
                    }
                }
            }

            try {
                ILinkTarget? target;
                string url;


                if (LinkType == CommandLinkType.Prompt) {
                    target = await PromptForTargetAsync(info);

                    if (target is null) {
                        return;
                    }

                } else {
                    target = new LinkTargetPreset(GetPresetLinkType(LinkType));
                }

                url = await info.Handler.CreateUrlAsync(
                    info.Repository,
                    new FileInfo(info.FilePath, selection),
                    new LinkOptions(target)
                );

                await logger.LogAsync($"URL created: {url}");

                switch (Action) {
                    case CommandAction.Copy:
                        System.Windows.Clipboard.SetText(url);
                        await VS.StatusBar.ShowMessageAsync($"Link copied to {info.Handler.Name}");
                        break;

                    case CommandAction.Open:
                        await OpenUrlAsync(url, logger);
                        break;

                }

            } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
                await logger.LogAsync($"Error while generating a URL: {ex}");

                if (ex is NoRemoteHeadException) {
                    await VS.MessageBox.ShowErrorAsync(
                        Resources.Strings.GetLinkCommand_NoRemoteHead.Format(
                            info.Repository.Root,
                            info.Repository.Remote?.Name
                        )
                    );

                } else {
                    await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_Error);
                }
            }
        }

    }


    private async Task<ResourceInfo?> GetResourceInfoAsync(string path, ILogger logger) {
        RepositoryFinder repositoryFinder;
        LinkHandlerProvider handlerProvider;
        Repository? repository;
        ILinkHandler? handler;


        repositoryFinder = await Package.GetServiceAsync<RepositoryFinder, RepositoryFinder>();

        repository = await repositoryFinder.FindRepositoryAsync(path);

        if (repository is null) {
            await logger.LogAsync("File is not tracked by Git.");
            await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_NotTrackedByGit.Format(path));
            return null;
        }

        if (repository.Remote is null) {
            await logger.LogAsync("Repository does not have a remote.");
            await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_NoRemotes.Format(repository.Root));
            return null;
        }

        handlerProvider = await Package.GetServiceAsync<LinkHandlerProvider, LinkHandlerProvider>();
        handler = await handlerProvider.SelectAsync(repository);

        if (handler is null) {
            await logger.LogAsync($"No handler for remote '{repository.Remote}'.");
            await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_NoHandler.Format(repository.Remote.Url));
            return null;
        }

        return new ResourceInfo(path, repository, handler);
    }


    private static SelectedRange GetSelectedRange(IWpfTextView textView) {
        SnapshotPoint start;
        SnapshotPoint end;


        start = textView.Selection.Start.Position;
        end = textView.Selection.End.Position;

        // If the selection ends at the start of a new line,
        // then change it to end at the end of the previous line.
        if (end.GetContainingLineNumber() > start.GetContainingLineNumber()) {
            ITextSnapshotLine endLine;


            endLine = end.GetContainingLine();

            if (end.Position == endLine.Start) {
                end = end.Snapshot.GetLineFromLineNumber(endLine.LineNumber - 1).Start;
            }
        }

        // The line numbers are zero-based in the editor,
        // but we need them to be one-based for URLs.
        return new SelectedRange(
            start.GetContainingLineNumber() + 1,
            start.GetContainingLine().Start.Difference(start) + 1,
            end.GetContainingLineNumber() + 1,
            end.GetContainingLine().Start.Difference(end) + 1
        );
    }


    private async Task<ILinkTarget?> PromptForTargetAsync(GetLinkCommandBase<T>.ResourceInfo info) {
        LinkTargetSelector selector;


        selector = await Package.GetServiceAsync<LinkTargetSelector, LinkTargetSelector>();

        return await selector.SelectAsync(info.Handler, info.Repository);
    }


    private LinkType? GetPresetLinkType(CommandLinkType linkType) {
        switch (linkType) {
            case CommandLinkType.DefaultBranch:
                return GitWebLinks.LinkType.DefaultBranch;

            case CommandLinkType.CurrentBranch:
                return GitWebLinks.LinkType.CurrentBranch;

            case CommandLinkType.Commit:
                return GitWebLinks.LinkType.Commit;

            default:
                return null;
        }
    }


    private async Task OpenUrlAsync(string url, ILogger logger) {
        try {
            using (Process.Start(url)) { }

        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            await logger.LogAsync($"Error opening URL: {ex.Message}");
            await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_FailedToOpenLink);

        }
    }

}
