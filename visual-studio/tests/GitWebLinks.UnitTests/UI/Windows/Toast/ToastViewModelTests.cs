using Microsoft.VisualStudio.Threading;
using NSubstitute;
using System.Windows;

namespace GitWebLinks;

public class ToastViewModelTests : IDisposable {

    private readonly JoinableTaskContext _joinableTaskContext = new();


    [Theory]
    [InlineData(LinkFormat.Raw, false)]
    [InlineData(LinkFormat.Markdown, true)]
    [InlineData(LinkFormat.MarkdownWithPreview, true)]
    public void CopyRawCommand(LinkFormat copiedFormat, bool canCopy) {
        ToastViewModel viewModel;


        viewModel = CreateViewModel(
            copiedFormat,
            new Dictionary<LinkFormat, string> {
                [LinkFormat.Raw] = "x",
                [LinkFormat.Markdown] = "x",
                [LinkFormat.MarkdownWithPreview] = "x"
            }
        );

        Assert.Equal(canCopy, viewModel.CopyRawCommand.CanExecute(null));
        Assert.Equal(canCopy ? Visibility.Visible : Visibility.Collapsed, viewModel.CopyRawVisibility);
    }


    [Theory]
    [InlineData(LinkFormat.Raw, "raw", "preview", true)]
    [InlineData(LinkFormat.Raw, "markdown", "preview", true)]
    [InlineData(LinkFormat.Markdown, "markdown", "preview", false)]
    [InlineData(LinkFormat.Markdown, "markdown", "markdown", false)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "preview", true)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "markdown", false)]
    public void CopyMarkdownCommand(LinkFormat copiedFormat, string markdownLink, string previewLink, bool canCopy) {
        ToastViewModel viewModel;


        viewModel = CreateViewModel(
            copiedFormat,
            new Dictionary<LinkFormat, string> {
                [LinkFormat.Raw] = "raw",
                [LinkFormat.Markdown] = markdownLink,
                [LinkFormat.MarkdownWithPreview] = previewLink
            }
        );

        Assert.Equal(canCopy, viewModel.CopyMarkdownCommand.CanExecute(null));
        Assert.Equal(canCopy ? Visibility.Visible : Visibility.Collapsed, viewModel.CopyMarkdownVisibility);
    }


    [Theory]
    [InlineData(LinkFormat.Raw, "raw", "preview", true)]
    [InlineData(LinkFormat.Raw, "markdown", "preview", true)]
    [InlineData(LinkFormat.Markdown, "markdown", "preview", true)]
    [InlineData(LinkFormat.Markdown, "markdown", "markdown", false)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "preview", false)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "markdown", false)]
    public void CopyMarkdownWithPreviewCommand(LinkFormat copiedFormat, string markdownLink, string previewLink, bool canCopy) {
        ToastViewModel viewModel;


        viewModel = CreateViewModel(
            copiedFormat,
            new Dictionary<LinkFormat, string> {
                [LinkFormat.Raw] = "raw",
                [LinkFormat.Markdown] = markdownLink,
                [LinkFormat.MarkdownWithPreview] = previewLink
            }
        );

        Assert.Equal(canCopy, viewModel.CopyMarkdownWithPreviewCommand.CanExecute(null));
        Assert.Equal(canCopy ? Visibility.Visible : Visibility.Collapsed, viewModel.CopyMarkdownWithPreviewVisibility);
    }


    [Theory]
    [InlineData(LinkFormat.Raw, "markdown", "preview", false)]
    [InlineData(LinkFormat.Raw, "markdown", "markdown", false)]
    [InlineData(LinkFormat.Markdown, "markdown", "preview", false)]
    [InlineData(LinkFormat.Markdown, "markdown", "markdown", false)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "preview", true)]
    [InlineData(LinkFormat.MarkdownWithPreview, "markdown", "markdown", false)]
    public void CopyMarkdownLabel(LinkFormat copiedFormat, string markdownLink, string previewLink, bool usesWithoutPreview) {
        ToastViewModel viewModel;
        Dictionary<LinkFormat, string> links;


        links = new Dictionary<LinkFormat, string> {
            [LinkFormat.Raw] = "raw",
            [LinkFormat.Markdown] = markdownLink,
            [LinkFormat.MarkdownWithPreview] = previewLink
        };

        viewModel = CreateViewModel(copiedFormat, links);

        Assert.Equal(
            usesWithoutPreview
                ? Resources.Strings.Toast_CopyMarkdownWithoutPreview
                : Resources.Strings.Toast_CopyMarkdown,
            viewModel.CopyMarkdownLabel
        );
    }


    private ToastViewModel CreateViewModel(LinkFormat copiedLinkFormat, Dictionary<LinkFormat, string> links) {
        return new ToastViewModel(
            "Test",
            copiedLinkFormat,
            links,
            () => { },
            Substitute.For<IClipboard>(),
            _joinableTaskContext.Factory
        );
    }


    public void Dispose() {
        _joinableTaskContext.Dispose();
    }

}
