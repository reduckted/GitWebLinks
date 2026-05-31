using Fluid;
using NSubstitute;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class LinkTargetLoaderTests {

    public class LoadAsyncMethod : RepositoryTestBase, IAsyncLifetime {

        private readonly Repository _repository;
        private readonly ISettings _settings;
        private readonly List<Ref> _commitsInBranchOrder = [];
        private readonly List<Ref> _commitsInHashOrder = [];
        private Ref? _detachedHeadHash;


        public LoadAsyncMethod() {
            _repository = new Repository(RootDirectory, new Remote("origin", ["http://example.com"]));

            _settings = Substitute.For<ISettings>();
            _settings.GetDefaultLinkTypeAsync().Returns(LinkType.DefaultBranch);
            _settings.GetDefaultBranchAsync().Returns("master");
            _settings.GetUseShortHashesAsync().Returns(true);
        }


        public async ValueTask InitializeAsync() {
            _commitsInBranchOrder.Clear();
            _commitsInHashOrder.Clear();

            await SetupRepositoryAsync(RootDirectory);

            CreateFile("0");
            await Git.ExecuteAsync(RootDirectory, "add", "*");
            await Git.ExecuteAsync(RootDirectory, "commit", "-m", "0");
            _commitsInBranchOrder.Add(await GetRefAsync("master"));

            await Git.ExecuteAsync(RootDirectory, "checkout", "-b", "first");
            CreateFile("1");
            await Git.ExecuteAsync(RootDirectory, "add", "*");
            await Git.ExecuteAsync(RootDirectory, "commit", "-m", "1");
            _commitsInBranchOrder.Add(await GetRefAsync("first"));

            await Git.ExecuteAsync(RootDirectory, "checkout", "-b", "second");
            CreateFile("2");
            await Git.ExecuteAsync(RootDirectory, "add", "*");
            await Git.ExecuteAsync(RootDirectory, "commit", "-m", "2");

            // Store this commit as the one we will use for a detached HEAD state.
            _detachedHeadHash = await GetRefAsync("second");

            CreateFile("3");
            await Git.ExecuteAsync(RootDirectory, "add", "*");
            await Git.ExecuteAsync(RootDirectory, "commit", "-m", "3");
            _commitsInBranchOrder.Add(await GetRefAsync("second"));

            await Git.ExecuteAsync(RootDirectory, "tag", "v1.0.0");
            await Git.ExecuteAsync(RootDirectory, "tag", "v2.0.0");

            _commitsInHashOrder.AddRange(_commitsInBranchOrder.OrderBy((x) => x.Abbreviated));

            async Task<Ref> GetRefAsync(string branchName) {
                return new Ref {
                    Abbreviated = (await Git.ExecuteAsync(RootDirectory, "rev-parse", "--short", "HEAD"))[0].Trim(),
                    Symbolic = (await Git.ExecuteAsync(RootDirectory, "rev-parse", "HEAD"))[0].Trim(),
                    BranchName = branchName
                };
            }
        }


        [Fact]
        public async Task ShouldShowCurrentCommitPresetFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            _settings.GetDefaultLinkTypeAsync().Returns(LinkType.Commit);

            loader = CreateLoader(CreateHandler(false));

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                    new TargetItem(
                        "Current commit",
                        _commitsInBranchOrder[2].Abbreviated,
                        LinkType.Commit,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current branch",
                        "second",
                        LinkType.CurrentBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Default branch",
                        "master",
                        LinkType.DefaultBranch,
                        LinkTargetListItemKind.Preset
                    )
                }.Concat(GetExpectedBranchItems()).Concat(GetExpectedCommitItems()),
                items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
            );
        }


        [Fact]
        public async Task ShouldShowCurrentBranchFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            _settings.GetDefaultLinkTypeAsync().Returns(LinkType.CurrentBranch);

            loader = CreateLoader(CreateHandler(false));

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                    new TargetItem(
                        "Current branch",
                        "second",
                        LinkType.CurrentBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current commit",
                        _commitsInBranchOrder[2].Abbreviated,
                        LinkType.Commit,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Default branch",
                        "master",
                        LinkType.DefaultBranch,
                        LinkTargetListItemKind.Preset
                    )
                }.Concat(GetExpectedBranchItems()).Concat(GetExpectedCommitItems()),
                items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
            );
        }


        [Fact]
        public async Task ShouldShowDefaultBranchFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            _settings.GetDefaultLinkTypeAsync().Returns(LinkType.DefaultBranch);

            loader = CreateLoader(CreateHandler(false));

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                     new TargetItem(
                        "Default branch",
                        "master",
                        LinkType.DefaultBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current branch",
                        "second",
                        LinkType.CurrentBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current commit",
                        _commitsInBranchOrder[2].Abbreviated,
                        LinkType.Commit,
                        LinkTargetListItemKind.Preset
                    )
                }.Concat(GetExpectedBranchItems()).Concat(GetExpectedCommitItems()),
                items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
            );
        }


        [Fact]
        public async Task CatchesNoRemoteHeadException() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;
            ILinkHandler handler;


            handler = Substitute.For<ILinkHandler>();

            handler.SupportsTags.Returns(false);
            handler.GetRefAsync(LinkType.Commit, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the commit");
            handler.GetRefAsync(LinkType.CurrentBranch, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the branch");
            handler
                .GetRefAsync(LinkType.DefaultBranch, Arg.Any<string>(), Arg.Any<Remote>())
                .Returns(Task.FromException<string>(new NoRemoteHeadException("")));

            loader = CreateLoader(handler);

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                     new TargetItem(
                        "Default branch",
                        "",
                        LinkType.DefaultBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current branch",
                        "the branch",
                        LinkType.CurrentBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current commit",
                        "the commit",
                        LinkType.Commit,
                        LinkTargetListItemKind.Preset
                    )
                }.Concat(GetExpectedBranchItems()).Concat(GetExpectedCommitItems()),
                items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
            );
        }


        [Fact]
        public async Task ShouldOmitCurrentBranchWhenItIsDetachedHead() {
            Assert.NotNull(_detachedHeadHash);
            await Git.ExecuteAsync(RootDirectory, "checkout", _detachedHeadHash.Symbolic);

            try {
                LinkTargetLoader loader;
                IReadOnlyList<LinkTargetListItem> items;


                loader = CreateLoader(CreateHandler(false));

                items = await loader.LoadAsync();

                Assert.Equal(
                    new[] {
                        new TargetItem(
                            "Default branch",
                            "master",
                            LinkType.DefaultBranch,
                            LinkTargetListItemKind.Preset
                        ),
                        new TargetItem(
                            "Current commit",
                            _detachedHeadHash.Abbreviated,
                            LinkType.Commit,
                            LinkTargetListItemKind.Preset
                        )
                    }.Concat(GetExpectedBranchItems()).Concat(
                        GetExpectedCommitItems().Append(
                            new TargetItem(
                                _detachedHeadHash.Abbreviated,
                                $"(HEAD detached at {_detachedHeadHash.Abbreviated})",
                                default,
                                LinkTargetListItemKind.Commit
                            )
                        ).OrderBy((x) => x.Name)
                    ),
                    items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
                );

            } finally {
                await Git.ExecuteAsync(RootDirectory, "checkout", "-");
            }
        }


        [Fact]
        public async Task UsesLongHashesWhenSettingsUseLongHashes() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            _settings.GetUseShortHashesAsync().Returns(false);

            loader = CreateLoader(CreateHandler(false));

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                    ("Default branch", _commitsInBranchOrder[0].BranchName),
                    ("Current branch", _commitsInBranchOrder[2].BranchName),
                    ("Current commit", _commitsInBranchOrder[2].Symbolic),
                    ("first", _commitsInBranchOrder[1].Symbolic),
                    ("master", _commitsInBranchOrder[0].Symbolic),
                    ("second", _commitsInBranchOrder[2].Symbolic),
                    (_commitsInHashOrder[0].Symbolic, _commitsInHashOrder[0].BranchName),
                    (_commitsInHashOrder[1].Symbolic, _commitsInHashOrder[1].BranchName),
                    (_commitsInHashOrder[2].Symbolic, _commitsInHashOrder[2].BranchName)
                },
                items.Select((x) => (x.Name, x.Description)).ToArray()
            );
        }


        [Fact]
        public async Task IncludesTagsWhenHandlerSupportsTags() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            loader = CreateLoader(CreateHandler(true));

            items = await loader.LoadAsync();

            Assert.Equal(
                new[] {
                     new TargetItem(
                        "Default branch",
                        "master",
                        LinkType.DefaultBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current branch",
                        "second",
                        LinkType.CurrentBranch,
                        LinkTargetListItemKind.Preset
                    ),
                    new TargetItem(
                        "Current commit",
                        _commitsInBranchOrder[2].Abbreviated,
                        LinkType.Commit,
                        LinkTargetListItemKind.Preset
                    )
                }.Concat(GetExpectedBranchItems()).Concat(GetExpectedCommitItems()).Concat(
                    [
                        new TargetItem(
                            "v1.0.0",
                            "",
                            null,
                            LinkTargetListItemKind.Tag
                        ),
                        new TargetItem(
                            "v2.0.0",
                            "",
                            null,
                            LinkTargetListItemKind.Tag
                        )
                    ]
                ),
                items.Select((x) => new TargetItem(x.Name, x.Description, (x.Target as LinkTargetPreset)?.Type, x.Kind)).ToArray()
            );
        }


        private IEnumerable<TargetItem> GetExpectedBranchItems() {
            yield return new TargetItem(
                "first",
                _commitsInBranchOrder[1].Abbreviated,
                null,
                LinkTargetListItemKind.Branch
            );

            yield return new TargetItem(
                "master",
                _commitsInBranchOrder[0].Abbreviated,
                null,
                LinkTargetListItemKind.Branch
            );

            yield return new TargetItem(
                "second",
                _commitsInBranchOrder[2].Abbreviated,
                null,
                LinkTargetListItemKind.Branch
            );
        }


        private IEnumerable<TargetItem> GetExpectedCommitItems() {
            yield return new TargetItem(
                _commitsInHashOrder[0].Abbreviated,
                _commitsInHashOrder[0].BranchName,
                null,
                LinkTargetListItemKind.Commit
            );

            yield return new TargetItem(
                _commitsInHashOrder[1].Abbreviated,
                _commitsInHashOrder[1].BranchName,
                null,
                LinkTargetListItemKind.Commit
            );

            yield return new TargetItem(
                _commitsInHashOrder[2].Abbreviated,
                _commitsInHashOrder[2].BranchName,
                null,
                LinkTargetListItemKind.Commit
            );
        }


        private ILinkHandler CreateHandler(bool supportsTags) {
            FluidParser parser;
            IFluidTemplate emptyTemplate;


            parser = new FluidParser();
            emptyTemplate = parser.Parse("");

            return new LinkHandler(
                new PublicHandlerDefinition(
                    "test",
                    BranchRefType.Abbreviated,
                    supportsTags,
                    [],
                    emptyTemplate,
                    [],
                    emptyTemplate,
                    new ReverseSettings(
                        new Regex(""),
                        new FluidParser().Parse(""),
                        false,
                        new ReverseServerSettings(
                            emptyTemplate,
                            emptyTemplate,
                            emptyTemplate
                        ),
                        new ReverseSelectionSettings(
                            emptyTemplate,
                            null,
                            null,
                            null
                        )
                    ),
                    []
                ),
                _settings,
                Git
            );
        }


        private LinkTargetLoader CreateLoader(ILinkHandler handler) {
            return new LinkTargetLoader(_settings, Git, handler, _repository, NullLogger.Instance);
        }


        public ValueTask DisposeAsync() {
            return default;
        }


        private class Ref {

            public string Abbreviated { get; set; } = "";


            public string Symbolic { get; set; } = "";


            public string BranchName { get; set; } = "";

        }


        private struct TargetItem(string name, string description, LinkType? presetType, LinkTargetListItemKind kind) {

            public readonly string Name => name;


            public readonly string Description => description;


            public readonly LinkType? PresetType => presetType;


            public readonly LinkTargetListItemKind Kind => kind;

        }

    }

}
