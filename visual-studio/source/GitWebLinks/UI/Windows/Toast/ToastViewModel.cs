#nullable enable

using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Threading;
using System;
using System.Collections.Generic;
using System.Windows;

namespace GitWebLinks;

public class ToastViewModel : ObservableObject {

    private readonly Dictionary<LinkFormat, string> _links;
    private readonly Action _openInBrowser;
    private readonly IClipboard _clipboard;
    private readonly bool _canCopyRaw;
    private readonly bool _canCopyMarkdown;
    private readonly bool _canCopyMarkdownWithPreview;
    private bool _close;


    public ToastViewModel(
        string message,
        LinkFormat copiedLinkFormat,
        Dictionary<LinkFormat, string> links,
        Action openInBrowser,
        IClipboard clipboard,
        JoinableTaskFactory joinableTaskFactory
    ) {
        _links = links;
        _openInBrowser = openInBrowser;
        _clipboard = clipboard;

        Message = message;

        // The raw format can be copied if:
        //  - We originally used the markdown format.
        //  - We originally used the markdown with a preview format.
        //
        // It cannot be copied if:
        //  - We originally used the raw format.
        _canCopyRaw = copiedLinkFormat != LinkFormat.Raw;

        // The markdown format can be copied if:
        //  - We originally used the raw format.
        //  - We originally used the markdown with a
        //    preview format and it actually had a preview.
        //
        // It cannot be copied if:
        //  - We originally used the markdown format.
        //  - We originally used the markdown with a preview format
        //    but there was no preview, meaning it's just a markdown link.
        _canCopyMarkdown =
            (copiedLinkFormat == LinkFormat.Raw) ||
            (
                (copiedLinkFormat == LinkFormat.MarkdownWithPreview) &&
                (links[LinkFormat.MarkdownWithPreview] != links[LinkFormat.Markdown])
            );

        // The markdown with a preview format can be copied if:
        //  - We originally used the raw format.
        //  - We originally used the markdown format and the markdown
        //    with a preview format will actually have a preview.
        //
        // It cannot be copied if:
        //  - We originally used the markdown with a preview format.
        //  - We originally used the markdown format and the
        //    markdown with a preview format doesn't have a preview.
        _canCopyMarkdownWithPreview =
            (copiedLinkFormat == LinkFormat.Raw) ||
            (
                (copiedLinkFormat == LinkFormat.Markdown) &&
                (links[LinkFormat.Markdown] != links[LinkFormat.MarkdownWithPreview])
            );

        CloseCommand = CreateCommand(OnClose, true);
        OpenInBrowserCommand = CreateCommand(OnOpenInBrowser, true);
        CopyRawCommand = CreateCommand(OnCopyRaw, _canCopyRaw);
        CopyMarkdownCommand = CreateCommand(OnCopyMarkdown, _canCopyMarkdown);
        CopyMarkdownWithPreviewCommand = CreateCommand(OnCopyMarkdownWithPreview, _canCopyMarkdownWithPreview);

        DelegateCommand CreateCommand(Action action, bool canExecute) {
            return new DelegateCommand(action, () => canExecute, joinableTaskFactory);
        }
    }


    public string Message { get; }


    public Visibility CopyRawVisibility => _canCopyRaw ? Visibility.Visible : Visibility.Collapsed;


    public Visibility CopyMarkdownVisibility => _canCopyMarkdown ? Visibility.Visible : Visibility.Collapsed;


    public Visibility CopyMarkdownWithPreviewVisibility => _canCopyMarkdownWithPreview ? Visibility.Visible : Visibility.Collapsed;


    public string CopyMarkdownLabel =>
        // When you can copy the raw URL and as markdown, but you cannot copy as markdown
        // with a preview, then the link that was originally copied must have been the
        // markdown with a preview.We will change the text on the "Copy as Markdown"
        // button to indicate that it will copy the link without a preview.
        _canCopyRaw && _canCopyMarkdown && !_canCopyMarkdownWithPreview
            ? Resources.Strings.Toast_CopyMarkdownWithoutPreview
            : Resources.Strings.Toast_CopyMarkdown;


    public DelegateCommand CloseCommand { get; }


    public DelegateCommand OpenInBrowserCommand { get; }


    public DelegateCommand CopyRawCommand { get; }


    public DelegateCommand CopyMarkdownCommand { get; }


    public DelegateCommand CopyMarkdownWithPreviewCommand { get; }


    public bool Close {
        get => _close;
        set => SetProperty(ref _close, value);
    }


    private void OnClose() {
        Close = true;
    }


    private void OnOpenInBrowser() {
        _openInBrowser();
        OnClose();
    }


    private void OnCopyRaw() {
        _clipboard.SetText(_links[LinkFormat.Raw]);
        OnClose();
    }


    private void OnCopyMarkdown() {
        _clipboard.SetText(_links[LinkFormat.Markdown]);
        OnClose();
    }


    private void OnCopyMarkdownWithPreview() {
        _clipboard.SetText(_links[LinkFormat.MarkdownWithPreview]);
        OnClose();
    }

}
