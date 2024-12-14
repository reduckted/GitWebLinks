using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.PatternMatching;
using Microsoft.VisualStudio.Threading;
using NSubstitute;
using System.Collections.Immutable;
using System.Windows;

namespace GitWebLinks;

public sealed class SelectTargetDialogViewModelTests : IDisposable {

    private readonly JoinableTaskContext _joinableTaskContext = new();


    [Fact]
    public async Task IsInitializedWithPresets() {
        SelectTargetDialogViewModel viewModel;
        ILinkTargetLoader loader;


        loader = CreateLoader(
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Substitute.For<ILinkTarget>())
            ],
            [],
            []
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader,
            Substitute.For<IPatternMatcherFactory>(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        Assert.Equal(["one", "two", "three"], viewModel.Targets.Select((x) => x.Name));

        await loader.Received(1).LoadPresetsAsync();
        Assert.Single(loader.ReceivedCalls());
    }


    [Fact]
    public async Task LoadsPresetDescriptionsAndBranchesAndCommitsOnLoad() {
        SelectTargetDialogViewModel viewModel;
        ILinkTargetLoader loader;


        loader = CreateLoader(
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Substitute.For<ILinkTarget>())
            ],
            ["1", "2"],
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Substitute.For<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Substitute.For <ILinkTarget>()) { Description = "4" }
            ]
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader,
            Substitute.For<IPatternMatcherFactory>(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        Assert.True(viewModel.IsLoading);
        Assert.Equal(Visibility.Visible, viewModel.LoadingVisibility);

        await viewModel.OnLoadedAsync();

        Assert.False(viewModel.IsLoading);
        Assert.Equal(Visibility.Collapsed, viewModel.LoadingVisibility);

        Assert.Equal(
            [
                ("one", "1"),
                ("two", "2"),
                ("three", "3"),
                ("four", "4")
            ],
            viewModel.Targets.Select((x) => (x.Name, x.Description))
        );

        await loader.Received(1).LoadPresetsAsync();
        await loader.Received(1).PopulatePresetDescriptionsAsync(Arg.Any<IEnumerable<LinkTargetListItem>>());
        await loader.Received(1).LoadBranchesAndCommitsAsync();
        Assert.Equal(3, loader.ReceivedCalls().Count());
    }


    [Fact]
    public async Task CanFilterTargetsByName() {
        SelectTargetDialogViewModel viewModel;
        ILinkTargetLoader loader;


        loader = CreateLoader(
        [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Substitute.For<ILinkTarget>())
            ],
            ["1", "2"],
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Substitute.For<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Substitute.For<ILinkTarget>()) { Description = "4" }
            ]
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["one", "two", "three", "four"], viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "t";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["two", "three"], viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "x";

        Assert.Equal(Visibility.Visible, viewModel.NoTargetsVisibility);
        Assert.Empty(viewModel.Targets);

        viewModel.FilterText = "";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["one", "two", "three", "four"], viewModel.Targets.Select((x) => x.Name));
    }


    [Fact]
    public async Task CanFilterTargetsByDescription() {
        SelectTargetDialogViewModel viewModel;
        ILinkTargetLoader loader;


        loader = CreateLoader(
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "1", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "2", Substitute.For<ILinkTarget>())
            ],
            ["first", "second"],
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "3", Substitute.For<ILinkTarget>()) { Description = "third" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "4", Substitute.For<ILinkTarget>()) { Description = "fourth" }
            ]
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["first", "second", "third", "fourth"], viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "t";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["first", "third", "fourth"], viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "x";

        Assert.Equal(Visibility.Visible, viewModel.NoTargetsVisibility);
        Assert.Empty(viewModel.Targets);

        viewModel.FilterText = "";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["first", "second", "third", "fourth"], viewModel.Targets.Select((x) => x.Description));
    }


    [Fact]
    public async Task AppliesFilterAfterLoading() {
        SelectTargetDialogViewModel viewModel;
        ILinkTargetLoader loader;


        loader = CreateLoader(
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "one", Substitute.For<ILinkTarget>()),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "two", Substitute.For<ILinkTarget>())
            ],
            ["1", "2"],
            [
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "three", Substitute.For<ILinkTarget>()) { Description = "3" },
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "four", Substitute.For<ILinkTarget>()) { Description = "4" }
            ]
        );

        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        viewModel.FilterText = "t";
        Assert.Equal(["two"], viewModel.Targets.Select((x) => x.Name));

        await viewModel.OnLoadedAsync();
        Assert.Equal(["two", "three"], viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "";
        Assert.Equal(["one", "two", "three", "four"], viewModel.Targets.Select((x) => x.Name));
    }


    private ILinkTargetLoader CreateLoader(
        IReadOnlyList<LinkTargetListItem> presets,
        IReadOnlyList<string> presetDescriptions,
        IReadOnlyList<LinkTargetListItem> branchesAndCommits
    ) {
        ILinkTargetLoader loader;


        loader = Substitute.For<ILinkTargetLoader>();

        loader.LoadPresetsAsync().Returns(presets);

        loader.PopulatePresetDescriptionsAsync(Arg.Any<IEnumerable<LinkTargetListItem>>()).Returns(
            (args) => {
                IEnumerable<LinkTargetListItem> collection;

                collection = args.ArgAt<IEnumerable<LinkTargetListItem>>(0);

                foreach ((LinkTargetListItem preset, string description) in collection.Zip(presetDescriptions, (preset, description) => (preset, description))) {
                    preset.Description = description;
                }

                return Task.CompletedTask;
            }
        );

        loader.LoadBranchesAndCommitsAsync().Returns(branchesAndCommits);

        return loader;
    }


    private IPatternMatcherFactory CreateMatcherFactory() {
        IPatternMatcherFactory factory;


        factory = Substitute.For<IPatternMatcherFactory>();

        factory
            .CreatePatternMatcher(Arg.Any<string>(), Arg.Any<PatternMatcherCreationOptions>())
            .Returns((args) => CreateMatcher(args.ArgAt<string>(0)));

        return factory;

        static IPatternMatcher CreateMatcher(string pattern) {
            IPatternMatcher matcher;


            matcher = Substitute.For<IPatternMatcher>();
            matcher.TryMatch(Arg.Any<string>()).Returns((args) => {
                int matchIndex;


                matchIndex = args.ArgAt<string>(0).IndexOf(pattern);

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

            return matcher;

        }
    }

    public void Dispose() {
        _joinableTaskContext.Dispose();
    }

}
