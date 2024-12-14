#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Threading.Tasks;

namespace GitWebLinks;

public abstract partial class GetLinkCommandBase<T> : BaseCommand<T> where T : GetLinkCommandBase<T>, new() {

    protected enum CommandAction {
        Copy,
        Open
    }


    private static readonly IReadOnlyDictionary<string, string> KnownLanguagesByFileExtension = new Dictionary<string, string> {
        { ".bash", "bash" },
        { ".bat", "bat" },
        { ".c", "c" },
        { ".cfg", "ini" },
        { ".clj", "clojure" },
        { ".cljs", "clojure" },
        { ".cmake", "cmake" },
        { ".cmd", "bat" },
        { ".cpp", "cpp" },
        { ".cs", "csharp" },
        { ".csproj", "xml" },
        { ".css", "css" },
        { ".diff", "diff" },
        { ".feature", "cucumber" },
        { ".fsproj", "xml" },
        { ".go", "go" },
        { ".h", "c" },
        { ".hpp", "cpp" },
        { ".hs", "haskell" },
        { ".htm", "html" },
        { ".html", "html" },
        { ".ini", "ini" },
        { ".jade", "jade" },
        { ".java", "java" },
        { ".js", "js" },
        { ".md", "markdown" },
        { ".php", "php" },
        { ".pl", "perl" },
        { ".proj", "xml" },
        { ".props", "xml" },
        { ".sass", "sass" },
        { ".scss", "scss" },
        { ".sh", "bash" },
        { ".sql", "sql" },
        { ".targets", "xml" },
        { ".ts", "ts" },
        { ".vb", "vbnet" },
        { ".vbproj", "xml" },
        { ".wsdl", "xml" },
        { ".xhtml", "html" },
        { ".xml", "xml" },
        { ".xsd", "xml" },
        { ".xsl", "xslt" },
        { ".xslt", "xslt" },
        { ".yaml", "yaml" },
        { ".yml", "yaml" }
    };


    private GeneralOptionsPage _options = default!; // Initialized immediately after the command is created.


    protected abstract bool IncludeSelection { get; }


    protected abstract CommandLinkType LinkType { get; }


    protected abstract CommandAction Action { get; }


    protected virtual bool IsVisible(GeneralOptionsPage options) {
        return true;
    }


    protected override Task InitializeCompletedAsync() {
        _options = (GeneralOptionsPage)Package.GetDialogPage(typeof(GeneralOptionsPage));
        return Task.CompletedTask;
    }


    protected override void BeforeQueryStatus(EventArgs e) {
        Command.Visible = IsVisible(_options);
    }


    protected override async Task ExecuteAsync(OleMenuCmdEventArgs e) {
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
            DocumentView? documentView = null;


            if (IncludeSelection) {
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
                CreateUrlResult result;


                if (LinkType == CommandLinkType.Prompt) {
                    target = await PromptForTargetAsync(info);

                    if (target is null) {
                        return;
                    }

                } else {
                    target = new LinkTargetPreset(GetPresetLinkType(LinkType));
                }

                result = await info.Handler.CreateUrlAsync(
                    info.Repository,
                    info.RemoteUrl,
                    new FileInfo(info.FilePath, selection),
                    new LinkOptions(target)
                );

                await logger.LogAsync($"URL created: {result.Url}");

                switch (Action) {
                    case CommandAction.Copy:
                        System.Windows.Clipboard.SetText(GetFormattedLink(result, _options.LinkFormat, documentView, selection));
                        await VS.StatusBar.ShowMessageAsync($"Link copied to {info.Handler.Name}");
                        break;

                    case CommandAction.Open:
                        await OpenUrlAsync(result.Url, logger);
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
        SelectedLinkHandler? match;


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
        match = await handlerProvider.SelectAsync(repository);

        if (match is null) {
            await logger.LogAsync($"No handler for remote '{repository.Remote.Name}'.");
            await VS.MessageBox.ShowErrorAsync(Resources.Strings.GetLinkCommand_NoHandler.Format(repository.Remote.Name));
            return null;
        }

        return new ResourceInfo(path, repository, match.Handler, match.RemoteUrl);
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


    private async Task<ILinkTarget?> PromptForTargetAsync(ResourceInfo info) {
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


    private string GetFormattedLink(CreateUrlResult result, LinkFormat format, DocumentView? documentView, SelectedRange? selection) {
        switch (format) {
            case LinkFormat.Markdown:
            case LinkFormat.MarkdownWithPreview:
                string link;


                link = $"[{result.RelativePath}{result.Selection}]({result.Url})";

                // Only include the preview if the
                // selection was included in the link.
                if ((format == LinkFormat.MarkdownWithPreview) && (documentView?.TextBuffer is not null) && (selection is not null)) {
                    StringBuilder codeBlock;
                    ITextSnapshot snapshot;
                    string? language;


                    snapshot = documentView.TextBuffer.CurrentSnapshot;

                    // There isn't a simple way to get the language of the current file,
                    // but we can use the file extension to map it to known languages.
                    if (!string.IsNullOrEmpty(documentView.FilePath)) {
                        KnownLanguagesByFileExtension.TryGetValue(
                            Path.GetExtension(documentView.FilePath),
                            out language
                        );
                    } else {
                        language = null;
                    }

                    codeBlock = new StringBuilder();
                    codeBlock.AppendLine($"```{language ?? ""}");

                    for (int lineNumber = selection.StartLine - 1; lineNumber < selection.EndLine; lineNumber++) {
                        codeBlock.AppendLine(snapshot.GetLineFromLineNumber(lineNumber).GetText());
                    }

                    codeBlock.AppendLine($"```");

                    link += Environment.NewLine + codeBlock.ToString();
                }

                return link;

            default: // LinkFormat.Raw.
                return result.Url;
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
