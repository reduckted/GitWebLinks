using NSubstitute;

namespace GitWebLinks;

public static class LinkTargetLoaderTests {

    public class LoadPresetsAsyncMethod : TestBase {

        [Fact]
        public async Task ShouldShowCurrentCommitFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> presets;


            Settings.GetDefaultLinkTypeAsync().Returns(LinkType.Commit);

            loader = CreateLoader(Substitute.For<ILinkHandler>());

            presets = await loader.LoadPresetsAsync();

            Assert.Equal(
                new[] {
                    ("Current commit", new LinkType?(LinkType.Commit)),
                    ("Current branch", new LinkType?(LinkType.CurrentBranch)),
                    ("Default branch", new LinkType?(LinkType.DefaultBranch))
                },
                presets.Select((x) => (x.Name, ((LinkTargetPreset)x.Target).Type)).ToArray()
            );
        }


        [Fact]
        public async Task ShouldShowCurrentBranchFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> presets;


            Settings.GetDefaultLinkTypeAsync().Returns(LinkType.CurrentBranch);

            loader = CreateLoader(Substitute.For<ILinkHandler>());

            presets = await loader.LoadPresetsAsync();

            Assert.Equal(
                new[] {
                    ("Current branch", new LinkType?(LinkType.CurrentBranch)),
                    ("Current commit", new LinkType?(LinkType.Commit)),
                    ("Default branch", new LinkType?(LinkType.DefaultBranch))
                },
                presets.Select((x) => (x.Name, ((LinkTargetPreset)x.Target).Type)).ToArray()
            );
        }


        [Fact]
        public async Task ShouldShowDefaultBranchFirstWhenItIsTheDefault() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> presets;


            Settings.GetDefaultLinkTypeAsync().Returns(LinkType.DefaultBranch);

            loader = CreateLoader(Substitute.For<ILinkHandler>());

            presets = await loader.LoadPresetsAsync();

            Assert.Equal(
                new[] {
                    ("Default branch", new LinkType?(LinkType.DefaultBranch)),
                    ("Current branch", new LinkType?(LinkType.CurrentBranch)),
                    ("Current commit", new LinkType?(LinkType.Commit))
                },
                presets.Select((x) => (x.Name, ((LinkTargetPreset)x.Target).Type)).ToArray()
            );
        }

    }


    public class PopulatePresetDescriptionsAsyncMethod : TestBase {

        [Fact]
        public async Task UsesTheHandlerToGetTheRefNames() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> presets;
            ILinkHandler handler;


            handler = Substitute.For<ILinkHandler>();

            handler.GetRefAsync(LinkType.Commit, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the commit");
            handler.GetRefAsync(LinkType.CurrentBranch, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the branch");
            handler.GetRefAsync(LinkType.DefaultBranch, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the default");

            loader = CreateLoader(handler);

            presets = new List<LinkTargetListItem> {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "Commit", new LinkTargetPreset(LinkType.Commit)),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "DefaultBranch", new LinkTargetPreset(LinkType.DefaultBranch)),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "CurrentBranch", new LinkTargetPreset(LinkType.CurrentBranch))
            };

            await loader.PopulatePresetDescriptionsAsync(presets);

            Assert.Equal(
                new[] {
                    "the commit",
                    "the default",
                    "the branch"
                },
                presets.Select((x) => x.Description).ToArray()
            );
        }


        [Fact]
        public async Task CatchesNoRemoteHeadException() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> presets;
            ILinkHandler handler;


            handler = Substitute.For<ILinkHandler>();

            handler.GetRefAsync(LinkType.Commit, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the commit");
            handler.GetRefAsync(LinkType.CurrentBranch, Arg.Any<string>(), Arg.Any<Remote>()).Returns("the branch");
            handler
                .GetRefAsync(LinkType.DefaultBranch, Arg.Any<string>(), Arg.Any<Remote>())
                .Returns(Task.FromException<string>(new NoRemoteHeadException("")));

            loader = CreateLoader(handler);

            presets = new List<LinkTargetListItem> {
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "CurrentBranch", new LinkTargetPreset(LinkType.CurrentBranch)),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "DefaultBranch", new LinkTargetPreset(LinkType.DefaultBranch)),
                new LinkTargetListItem(LinkTargetListItemKind.Preset, "Commit", new LinkTargetPreset(LinkType.Commit))
            };

            await loader.PopulatePresetDescriptionsAsync(presets);

            Assert.Equal(
                new[] {
                    "the branch",
                    "",
                    "the commit"
                },
                presets.Select((x) => x.Description).ToArray()
            );
        }

    }


    public class LoadBranchesAndCommitsAsyncMethod : TestBase {

        private readonly List<Ref> _commitsInBranchOrder = new();
        private readonly List<Ref> _commitsInHashOrder = new();


        [Fact]
        public async Task UsesShortHashesWhenSettingsUseShortHashes() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            Settings.GetUseShortHashesAsync().Returns(true);
            await SetupRepositoryAsync();

            loader = CreateLoader(Substitute.For<ILinkHandler>());

            items = await loader.LoadBranchesAndCommitsAsync();

            Assert.Equal(
                new[] {
                    ("first", _commitsInBranchOrder[1].Abbreviated, LinkTargetListItemKind.Branch),
                    ("master", _commitsInBranchOrder[0].Abbreviated, LinkTargetListItemKind.Branch),
                    ("second", _commitsInBranchOrder[2].Abbreviated, LinkTargetListItemKind.Branch),
                    (_commitsInHashOrder[0].Abbreviated, _commitsInHashOrder[0].BranchName, LinkTargetListItemKind.Commit),
                    (_commitsInHashOrder[1].Abbreviated, _commitsInHashOrder[1].BranchName, LinkTargetListItemKind.Commit),
                    (_commitsInHashOrder[2].Abbreviated, _commitsInHashOrder[2].BranchName, LinkTargetListItemKind.Commit)
                },
                items.Select((x) => (x.Name, x.Description, x.Kind)).ToArray()
            );
        }


        [Fact]
        public async Task UsesLongHashesWhenSettingsUseLongHashes() {
            LinkTargetLoader loader;
            IReadOnlyList<LinkTargetListItem> items;


            Settings.GetUseShortHashesAsync().Returns(false);
            await SetupRepositoryAsync();

            loader = CreateLoader(Substitute.For<ILinkHandler>());

            items = await loader.LoadBranchesAndCommitsAsync();

            Assert.Equal(
                new[] {
                    ("first", _commitsInBranchOrder[1].Symbolic, LinkTargetListItemKind.Branch),
                    ("master", _commitsInBranchOrder[0].Symbolic, LinkTargetListItemKind.Branch),
                    ("second", _commitsInBranchOrder[2].Symbolic, LinkTargetListItemKind.Branch),
                    (_commitsInHashOrder[0].Symbolic, _commitsInHashOrder[0].BranchName, LinkTargetListItemKind.Commit),
                    (_commitsInHashOrder[1].Symbolic, _commitsInHashOrder[1].BranchName, LinkTargetListItemKind.Commit),
                    (_commitsInHashOrder[2].Symbolic, _commitsInHashOrder[2].BranchName, LinkTargetListItemKind.Commit)
                },
                items.Select((x) => (x.Name, x.Description, x.Kind)).ToArray()
            );
        }


        private async Task SetupRepositoryAsync() {
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
            _commitsInBranchOrder.Add(await GetRefAsync("second"));

            _commitsInHashOrder.AddRange(_commitsInBranchOrder.OrderBy((x) => x.Abbreviated));
        }


        private async Task<Ref> GetRefAsync(string branchName) {
            return new Ref {
                Abbreviated = (await Git.ExecuteAsync(RootDirectory, "rev-parse", "--short", "HEAD"))[0].Trim(),
                Symbolic = (await Git.ExecuteAsync(RootDirectory, "rev-parse", "HEAD"))[0].Trim(),
                BranchName = branchName
            };
        }


        private class Ref {

            public string Abbreviated { get; set; } = "";


            public string Symbolic { get; set; } = "";


            public string BranchName { get; set; } = "";

        }

    }


    public abstract class TestBase : RepositoryTestBase {

        public TestBase() {
            Repository = new Repository(RootDirectory, new Remote("origin", new[] { "http://example.com" }));
            Settings = Substitute.For<ISettings>();
        }


        protected Repository Repository { get; }


        protected ISettings Settings { get; }


        protected LinkTargetLoader CreateLoader(ILinkHandler handler) {
            return new LinkTargetLoader(Settings, Git, handler, Repository, NullLogger.Instance);
        }

    }

}
