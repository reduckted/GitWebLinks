using Microsoft.VisualStudio.Imaging;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.PatternMatching;
using Microsoft.VisualStudio.Threading;
using NSubstitute;
using System.Collections.Immutable;
using System.Windows;

namespace GitWebLinks;

public sealed class SelectTargetDialogViewModelTests : IDisposable {

    private readonly JoinableTaskContext _joinableTaskContext;
    private readonly ILinkTargetLoader _loader;


    public SelectTargetDialogViewModelTests() {
        _joinableTaskContext = new JoinableTaskContext();

        _loader = CreateLoader(
            [
                new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "one",
                "alpha",
                KnownMonikers.Abbreviation,
                Substitute.For<ILinkTarget>()
            ),
            new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "two",
                "beta",
                KnownMonikers.Abbreviation,
                Substitute.For<ILinkTarget>()
            ),
            new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "three",
                "gamma",
                KnownMonikers.Abbreviation,
                Substitute.For<ILinkTarget>()
            ),
            new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "four",
                "delta",
                KnownMonikers.Abbreviation,
                Substitute.For <ILinkTarget>()
            )
            ]
        );

    }


    [Fact]
    public async Task LoadsItemsOnLoad() {
        SelectTargetDialogViewModel viewModel;


        viewModel = new SelectTargetDialogViewModel(
            _loader,
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
                ("one", "alpha"),
                ("two", "beta"),
                ("three", "gamma"),
                ("four", "delta")
            ],
            viewModel.Targets.Select((x) => (x.Name, x.Description))
        );

        await _loader.Received(1).LoadAsync();
    }


    [Fact]
    public async Task CanFilterTargetsByName() {
        SelectTargetDialogViewModel viewModel;


        viewModel = new SelectTargetDialogViewModel(
            _loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["one", "two", "three", "four"], viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "o";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["one", "two", "four"], viewModel.Targets.Select((x) => x.Name));

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


        viewModel = new SelectTargetDialogViewModel(
            _loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        );

        await viewModel.OnLoadedAsync();

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["alpha", "beta", "gamma", "delta"], viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "l";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["alpha", "delta"], viewModel.Targets.Select((x) => x.Description));

        viewModel.FilterText = "x";

        Assert.Equal(Visibility.Visible, viewModel.NoTargetsVisibility);
        Assert.Empty(viewModel.Targets);

        viewModel.FilterText = "";

        Assert.Equal(Visibility.Collapsed, viewModel.NoTargetsVisibility);
        Assert.Equal(["alpha", "beta", "gamma", "delta"], viewModel.Targets.Select((x) => x.Description));
    }


    [Fact]
    public async Task AppliesFilterAfterLoading() {
        SelectTargetDialogViewModel viewModel;


        viewModel = new SelectTargetDialogViewModel(
            _loader,
            CreateMatcherFactory(),
            new JoinableTaskFactory(_joinableTaskContext)
        ) { FilterText = "o" };

        Assert.Empty(viewModel.Targets);

        await viewModel.OnLoadedAsync();
        Assert.Equal(["one", "two", "four"], viewModel.Targets.Select((x) => x.Name));

        viewModel.FilterText = "";
        Assert.Equal(["one", "two", "three", "four"], viewModel.Targets.Select((x) => x.Name));
    }


    private ILinkTargetLoader CreateLoader(IReadOnlyList<LinkTargetListItem> items) {
        ILinkTargetLoader loader;


        loader = Substitute.For<ILinkTargetLoader>();
        loader.LoadAsync().Returns(items);

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
