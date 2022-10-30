using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.PatternMatching;
using Microsoft.VisualStudio.Threading;
using Moq;
using System.Collections.Immutable;
using System.Windows;

namespace GitWebLinks;

public sealed class SelectTargetDialogViewModelTests : IDisposable {

    private readonly JoinableTaskContext _joinableTaskContext = new();


    [Fact]
    public async Task IsInitializedWithPresets() {
        SelectTargetDialogViewModel viewModel;
        Mock<ILinkTargetLoader> loader;


        loader = CreateLoader(
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Mock.Of<ILinkTarget>())
            },
            Array.Empty<string>(),
            Array.Empty<LinkTargetListItem>()
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader.Object,
            Mock.Of<IPatternMatcherFactory>(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        Assert.Equal(new[] { "one", "two", "three" }, viewModel.Targets.Select((x) => x.Name));

        loader.Verify((x) => x.LoadPresetsAsync(), Times.Once());
        loader.VerifyNoOtherCalls();
    }


    [Fact]
    public async Task LoadsPresetDescriptionsAndBranchesAndCommitsOnLoad() {
        SelectTargetDialogViewModel viewModel;
        Mock<ILinkTargetLoader> loader;


        loader = CreateLoader(
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Mock.Of<ILinkTarget>())
            },
            new[] { "1", "2" },
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Mock.Of<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Mock.Of<ILinkTarget>()) { Description = "4" }
            }
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader.Object,
            Mock.Of<IPatternMatcherFactory>(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        Assert.True(viewModel.IsLoading);
        Assert.Equal(Visibility.Visible, viewModel.LoadingVisibility);

        await viewModel.OnLoadedAsync();

        Assert.False(viewModel.IsLoading);
        Assert.Equal(Visibility.Collapsed, viewModel.LoadingVisibility);

        Assert.Equal(
            new[] {
                ("one", "1"),
                ("two", "2"),
                ("three", "3"),
                ("four", "4")
            },
            viewModel.Targets.Select((x) => (x.Name, x.Description))
        );

        loader.Verify((x) => x.LoadPresetsAsync(), Times.Once());
        loader.Verify((x) => x.PopulatePresetDescriptionsAsync(It.IsAny<IEnumerable<LinkTargetListItem>>()), Times.Once());
        loader.Verify((x) => x.LoadBranchesAndCommitsAsync(), Times.Once());
        loader.VerifyNoOtherCalls();
    }


    [Fact]
    public async Task CanFilterTargetsByName() {
        SelectTargetDialogViewModel viewModel;
        Mock<ILinkTargetLoader> loader;


        loader = CreateLoader(
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Mock.Of<ILinkTarget>())
            },
            new[] { "1", "2" },
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Mock.Of<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Mock.Of<ILinkTarget>()) { Description = "4" }
            }
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader.Object,
            CreateMatcher(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "one", "two", "three", "four" }, viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "t";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "two", "three" }, viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "x";

        Assert.Equal(Visibility.Visible, viewModel.NoTargetsVisibility);
        Assert.Empty(viewModel.Targets);

        viewModel.FilterText = "";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "one", "two", "three", "four" }, viewModel.Targets.Select((x) => x.Name));
    }


    [Fact]
    public async Task CanFilterTargetsByDescription() {
        SelectTargetDialogViewModel viewModel;
        Mock<ILinkTargetLoader> loader;


        loader = CreateLoader(
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "1", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "2", Mock.Of<ILinkTarget>())
            },
            new[] { "first", "second" },
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "3", Mock.Of<ILinkTarget>()) { Description = "third" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "4", Mock.Of<ILinkTarget>()) { Description = "fourth" }
            }
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader.Object,
            CreateMatcher(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "first", "second", "third", "fourth" }, viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "t";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "first", "third", "fourth" }, viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "x";

        Assert.Equal(Visibility.Visible, viewModel.NoTargetsVisibility);
        Assert.Empty(viewModel.Targets);

        viewModel.FilterText = "";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(new[] { "first", "second", "third", "fourth" }, viewModel.Targets.Select((x) => x.Description));
    }


    [Fact]
    public async Task AppliesFilterAfterLoading() {
        SelectTargetDialogViewModel viewModel;
        Mock<ILinkTargetLoader> loader;


        loader = CreateLoader(
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Mock.Of<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Mock.Of<ILinkTarget>())
            },
            new[] { "1", "2" },
            new[] {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Mock.Of<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Mock.Of<ILinkTarget>()) { Description = "4" }
            }
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader.Object,
            CreateMatcher(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        viewModel.FilterText = "t";
        Assert.Equal(new[] { "two" }, viewModel.Targets.Select((x) => x.Name));

        await viewModel.OnLoadedAsync();
        Assert.Equal(new[] { "two", "three" }, viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "";
        Assert.Equal(new[] { "one", "two", "three", "four" }, viewModel.Targets.Select((x) => x.Name));
    }


    private Mock<ILinkTargetLoader> CreateLoader(
        IReadOnlyList<LinkTargetListItem> presets,
        IReadOnlyList<string> presetDescriptions,
        IReadOnlyList<LinkTargetListItem> branchesAndCommits
    ) {
        Mock<ILinkTargetLoader> loader;


        loader = new Mock<ILinkTargetLoader>();

        loader.Setup((x) => x.LoadPresetsAsync()).ReturnsAsync(presets);

        loader.Setup((x) => x.PopulatePresetDescriptionsAsync(It.IsAny<IEnumerable<LinkTargetListItem>>())).Callback(
            (IEnumerable<LinkTargetListItem> collection) => {
                foreach ((LinkTargetListItem preset, string description) in collection.Zip(presetDescriptions, (preset, description) => (preset, description))) {
                    preset.Description = description;
                }
            }
        );

        loader.Setup((x) => x.LoadBranchesAndCommitsAsync()).ReturnsAsync(branchesAndCommits);

        return loader;
    }


    private IPatternMatcherFactory CreateMatcher() {
        Mock<IPatternMatcherFactory> factory;


        factory = new Mock<IPatternMatcherFactory>();

        factory
            .Setup((x) => x.CreatePatternMatcher(It.IsAny<string>(), It.IsAny<PatternMatcherCreationOptions>()))
            .Returns((string pattern, PatternMatcherCreationOptions options) => {
                Mock<IPatternMatcher> matcher;


                matcher = new Mock<IPatternMatcher>();
                matcher.Setup((x) => x.TryMatch(It.IsAny<string>())).Returns((string candidate) => {
                    int matchIndex;


                    matchIndex = candidate.IndexOf(pattern);

                    if (matchIndex >= 0) {
                        return new PatternMatch(
                            PatternMatchKind.Exact,
                            false,
                            false,
                            ImmutableArray.Create(new Span(matchIndex, pattern.Length))
                        );

                    } else {
                        return null;
                    }
                });

                return matcher.Object;
            });

        return factory.Object;
    }

    public void Dispose() {
        _joinableTaskContext.Dispose();
    }

}
