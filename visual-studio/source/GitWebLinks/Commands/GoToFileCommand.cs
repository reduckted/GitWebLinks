#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Text;
using System;
using System.Threading.Tasks;

namespace GitWebLinks;

[Command(PackageIds.Command_GoToFile)]
public class GoToFileCommand : BaseCommand<GoToFileCommand> {

    protected override async Task ExecuteAsync(OleMenuCmdEventArgs e) {
        GoToFileDialog dialog;
        ILogger logger;


        await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
        logger = await Package.GetServiceAsync<ILogger, ILogger>();

        using (GoToFileDialogViewModel viewModel = new(
            await Package.GetServiceAsync<ILinkHandlerProvider, ILinkHandlerProvider>(),
            await Package.GetServiceAsync<IRepositoryFinder, IRepositoryFinder>(),
            await Package.GetServiceAsync<IClipboard, IClipboard>(),
            await VS.Services.GetSolutionAsync(),
            (IVsImageService2)await VS.Services.GetImageServiceAsync(),
            ThreadHelper.JoinableTaskFactory,
            logger
        )) {

            dialog = new GoToFileDialog { DataContext = viewModel };

            if (dialog.ShowModal().GetValueOrDefault()) {
                FileTarget? target;


                target = viewModel.SelectedTarget?.File;

                if (target is not null) {
                    DocumentView? document;

                    try {
                        document = await VS.Documents.OpenAsync(target.FileName);
                    } catch {
                        await logger.LogAsync($"Unable to open the file '{target.FileName}'.");
                        document = null;
                    }

                    if (document?.TextView is not null) {
                        (VirtualSnapshotPoint Anchor, VirtualSnapshotPoint Active)? selection;


                        selection = CreateSelection(document, target.Selection);

                        if (selection is not null) {
                            await logger.LogAsync($"Line selection converted to {selection.Value.Anchor.Position.Position}-{selection.Value.Active.Position.Position}");
                            document.TextView.Selection.Select(selection.Value.Anchor, selection.Value.Active);
                        }
                    }
                }
            }
        }
    }


    private (VirtualSnapshotPoint Anchor, VirtualSnapshotPoint Active)? CreateSelection(
       DocumentView document,
       PartialSelectedRange range
    ) {
        ITextSnapshot snapshot;
        int startLine;
        int startColumn;
        int endLine;
        int endColumn;
        int maxStartColumn;
        int maxEndColumn;
        ITextSnapshotLine startTextLine;
        ITextSnapshotLine endTextLine;


        if (document.TextBuffer is null) {
            return null;
        }

        snapshot = document.TextBuffer.CurrentSnapshot;

        // If there's no start line in the range, or the
        // document is empty, then there's nothing to select.
        if (range.StartLine is null || snapshot.LineCount == 0) {
            return null;
        }

        // Coerce the start line to be within the bounds of the document.
        // Note that at this point, the line number is one-based.
        startLine = Math.Min(Math.Max(range.StartLine.Value, 1), snapshot.LineCount);
        startTextLine = snapshot.GetLineFromLineNumber(startLine - 1);
        maxStartColumn = startTextLine.Length + 1;

        // If there's a start column, start from that position (but don't start from
        // beyond the end of the line); otherwise, start from the start of the line.
        startColumn = range.StartColumn is not null
            ? Math.Min(Math.Max(range.StartColumn.Value, 1), maxStartColumn)
            : 1;

        if (range.EndLine is null) {
            // There is no end line, so we'll select the entire start
            // line. Note that at this point, the column number is
            // one-based, whereas the TextLine's position is zero-based.
            endLine = startLine;
        } else {
            // Coerce the end line to be within the bounds of the document.
            // Note that at this point, the line number is one-based.
            endLine = Math.Min(Math.Max(range.EndLine.Value, 1), snapshot.LineCount);
        }

        endTextLine = snapshot.GetLineFromLineNumber(endLine - 1);
        maxEndColumn = endTextLine.Length + 1;

        // If there's an end column, end at that position (but don't end
        // beyond the end of the line); otherwise, end at the end of the line.
        endColumn = range.EndColumn is not null
            ? Math.Min(Math.Max(range.EndColumn.Value, 1), maxEndColumn)
            : maxEndColumn;

        // The line numbers are one-based in the range,
        // but the editor needs them to be zero-based.
        return (
            new VirtualSnapshotPoint(startTextLine, startColumn - 1),
            new VirtualSnapshotPoint(endTextLine, endColumn - 1)
        );
    }

}
