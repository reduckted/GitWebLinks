using Fluid;
using NSubstitute;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class LinkHandlerTests {

    private static readonly FluidParser Parser = new();
    private static readonly IFluidTemplate EmptyTemplate = Parser.Parse("");


    public class CreateUrlAsyncMethod : RepositoryTestBase {

        private readonly ISettings _settings;
        private Repository _repository;


        static CreateUrlAsyncMethod() {
            TemplateEngine.Initialize();
        }


        public CreateUrlAsyncMethod() {
            _settings = Substitute.For<ISettings>();

            _repository = new Repository(
                RootDirectory,
                new Remote("origin", "http://example.com")
            );
        }


        [Theory]
        [InlineData(LinkType.Commit, "commit")]
        [InlineData(LinkType.CurrentBranch, "branch")]
        public async Task ShouldUseTheDefaultLinkTypeIfNoTypeWasSpecified(LinkType type, string expected) {
            await SetupRepositoryAsync(RootDirectory);

            _settings.GetDefaultLinkTypeAsync().Returns(type);

            Assert.Equal(
                expected,
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ type }}" },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheFullCommitHashAsTheRefValueWhenTheLinkTypeIsCommitAndShortHashesShouldNotBeUsed() {
            await SetupRepositoryAsync(RootDirectory);

            _settings.GetUseShortHashesAsync().Returns(false);

            Assert.Equal(
                string.Concat(await Git.ExecuteAsync(RootDirectory, "rev-parse", "HEAD")).Trim(),
                await CreateUrlAsync(new PartialHandlerDefinition { Url = "{{ ref }}" }, new LinkTargetPreset(LinkType.Commit))
            );
        }


        [Fact]
        public async Task ShouldUseTheShortCommitHashAsTheRefValueWhenTheLinkTypeIsCommitAndShortHashesShouldBeUsed() {
            await SetupRepositoryAsync(RootDirectory);

            _settings.GetUseShortHashesAsync().Returns(true);

            Assert.Equal(
                string.Concat(await Git.ExecuteAsync(RootDirectory, "rev-parse", "--short", "HEAD")).Trim(),
                await CreateUrlAsync(new PartialHandlerDefinition { Url = "{{ ref }}" }, new LinkTargetPreset(LinkType.Commit))
            );
        }


        [Fact]
        public async Task ShouldUseTheBranchNameAsTheRefValueWhenTheLinkTypeIsCurrentBranch() {
            await SetupRepositoryAsync(RootDirectory);

            await Git.ExecuteAsync(RootDirectory, "checkout", "-b", "foo");

            Assert.Equal(
                "foo",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "{{ ref }}",
                        BranchRef = BranchRefType.Abbreviated
                    },
                    new LinkTargetPreset(LinkType.CurrentBranch)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheDefaultBranchNameAsTheRefValueWhenTheLinkTypeIsDefaultBranchAndDefaultBranchIsSpecified() {
            _settings.GetDefaultBranchAsync().Returns("bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ ref }}" },
                    new LinkTargetPreset(LinkType.DefaultBranch)
                )
            );
        }


        [Fact]
        public async Task ShouldThrowErrorWhenTheLinkTypeIsDefaultBranchAndTheRemoteDoesNotHaveHeadRef() {
            string origin;
            string repo;


            _settings.GetDefaultBranchAsync().Returns("");

            origin = CreateDirectory("origin");
            repo = CreateDirectory("repo");

            await SetupRepositoryAsync(repo);
            await SetupRemoteAsync(repo, origin, "origin");

            SetRepositoryRoot(repo);

            await Assert.ThrowsAsync<NoRemoteHeadException>(
                () => CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ ref }}" },
                    new LinkTargetPreset(LinkType.DefaultBranch)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheDefaultBranchOfTheRemoteAsTheRefValueWhenTheLinkTypeIsDefaultBranchAndDefaultBranchIsNotSpecified() {
            string origin;
            string repo;


            _settings.GetDefaultBranchAsync().Returns("");

            origin = CreateDirectory("origin");
            repo = CreateDirectory("repo");

            await SetupRepositoryAsync(repo);
            await Git.ExecuteAsync(repo, "checkout", "-b", "foo");
            await SetupRemoteAsync(repo, origin, "origin");

            await Git.ExecuteAsync(repo, "remote", "set-head", "origin", "master");

            SetRepositoryRoot(repo);

            Assert.Equal(
                "master",
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ ref }}", BranchRef = BranchRefType.Abbreviated },
                    new LinkTargetPreset(LinkType.DefaultBranch)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheGivenShortCommitHashWhenShortHashesShouldBeUsed() {
            _settings.GetUseShortHashesAsync().Returns(true);

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "short.commit",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "{{ ref }}.{{ type }}"
                    },
                    new LinkTargetRef(new RefInfo("short", "long"), RefType.Commit)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheGivenLongCommitHashWhenShortHashesShouldNotBeUsed() {
            _settings.GetUseShortHashesAsync().Returns(false);

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "long.commit",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "{{ ref }}.{{ type }}"
                    },
                    new LinkTargetRef(new RefInfo("short", "long"), RefType.Commit)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheGivenShortBranchNameWhenAbbreviatedBranchRefsShouldBeUsed() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "short.branch",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "{{ ref }}.{{ type }}",
                        BranchRef = BranchRefType.Abbreviated
                    },
                    new LinkTargetRef(new RefInfo("short", "long"), RefType.Branch)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheGivenLongBranchNameWhenSymbolicBranchRefsShouldBeUsed() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "long.branch",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "{{ ref }}.{{ type }}",
                        BranchRef = BranchRefType.Symbolic
                    },
                    new LinkTargetRef(new RefInfo("short", "long"), RefType.Branch)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerHttpAddressEndingWithSlash() {
            SetRemoteUrl("http://example.com/foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerHttpAddressNotEndingWithSlash() {
            SetRemoteUrl("http://example.com/foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
            "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com", "", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerSshAddressEndingWithSlash() {
            SetRemoteUrl("ssh://git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com", "ssh://git@example.com/", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerSshAddressNotEndingWithSlash() {
            SetRemoteUrl("ssh://git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com", "ssh://git@example.com", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerSshAddressNotEndingWithColon() {
            SetRemoteUrl("ssh://git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
              "http://example.com | foo/bar",
              await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "ssh://git@example.com", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleTheMatchingServerSshAddressEndingWithColon() {
            SetRemoteUrl("ssh://git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "ssh://git@example.com:", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldTrimDotGitFromTheEndOfTheRepositoryPath() {
            SetRemoteUrl("http://example.com/foo/bar.git");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com", "", null),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleSshUrlWithProtocol() {
            SetRemoteUrl("git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "ssh://git@example.com", null),
                        Url = "{{ base }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleSshUrlWithoutProtocol() {
            SetRemoteUrl("git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "git@example.com", null),
                        Url = "{{ base }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleSshWithGitAt() {
            SetRemoteUrl("git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "git@example.com", null),
                        Url = "{{ base }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldHandleSshWithoutGitAt() {
            SetRemoteUrl("git@example.com:foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "example.com", null),
                        Url = "{{ base }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheWebAddressFromTheMatchingServer() {
            SetRemoteUrl("http://example.com/foo/bar");

            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://web.example.com | foo/bar",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Server = new StaticServer("http://example.com/", "", "http://web.example.com/"),
                        Url = "{{ base }} | {{ repository }}"
                    },
                    new LinkTargetPreset(null)
                )
            );
        }



        [Fact]
        public async Task ShouldUseTheRealPathForFilesUnderDirectoryThatIsSymbolicLink() {
            string real;
            string link;


            await SetupRepositoryAsync(RootDirectory);

            real = CreateDirectory("real");
            link = Path.Combine(RootDirectory, "link");

            if (!NativeMethods.CreateSymbolicLink(link, real, NativeMethods.SYMBOLIC_LINK_FLAG_DIRECTORY)) {
                throw new InvalidOperationException("Could not create symlink.");
            }

            CreateFile("real/foo.js");

            Assert.Equal(
                "http://example.com/real/foo.js",
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ base }}/{{ file }}" },
                    new LinkTargetPreset(LinkType.CurrentBranch),
                    filePath: Path.Combine(link, "foo.js")
                )
            );
        }


        [Fact]
        public async Task ShouldUseTheRealPathForFileThatIsSymbolicLink() {
            string link;
            string file;


            await SetupRepositoryAsync(RootDirectory);

            CreateDirectory("real");
            file = CreateFile("real/foo.js");

            link = Path.Combine(RootDirectory, "link.js");

            if (!NativeMethods.CreateSymbolicLink(link, file, 0)) {
                throw new InvalidOperationException("Could not create symlink.");
            }

            Assert.Equal(
                "http://example.com/real/foo.js",
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ base }}/{{ file }}" },
                    new LinkTargetPreset(LinkType.CurrentBranch),
                    filePath: link
                )
            );
        }


        [Fact]
        public async Task ShouldNotUseTheRealPathWhenTheEntireGitRepositoryIsUnderSymbolicLink() {
            string real;
            string link;


            real = CreateDirectory("repo");
            await SetupRepositoryAsync(real);

            link = Path.Combine(RootDirectory, "link");

            if (!NativeMethods.CreateSymbolicLink(link, real, NativeMethods.SYMBOLIC_LINK_FLAG_DIRECTORY)) {
                throw new InvalidOperationException("Could not create symlink.");
            }

            SetRepositoryRoot(link);

            CreateFile("repo/foo.js");

            Assert.Equal(
                "http://example.com/foo.js",
                await CreateUrlAsync(
                    new PartialHandlerDefinition { Url = "{{ base }}/{{ file }}" },
                    new LinkTargetPreset(LinkType.CurrentBranch),
                    filePath: Path.Combine(link, "foo.js")
                )
            );
        }


        [Fact]
        public async Task ShouldNotApplyQueryModificationsWhenNoQueryModificationsMatch() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com/file",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "http://example.com/file",
                        Query = new[] { new QueryModification(new Regex("\\.js$"), "a", "1") }
                    },
                    new LinkTargetPreset(null),
                    filePath: "foo/bar.txt"
                )
            );
        }


        [Fact]
        public async Task ShouldAddQueryStringIfOneDoesNotExistWhenQueryModificationMatches() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com/file?first=yes",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "http://example.com/file",
                        Query = new[] { new QueryModification(new Regex("\\.txt$"), "first", "yes") }
                    },
                    new LinkTargetPreset(null),
                    filePath: "foo/bar.txt"
                )
            );
        }


        [Fact]
        public async Task ShouldAddToTheExistingQueryStringIfOneExistsWhenQueryModificationMatches() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com/file?first=yes&second=no",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "http://example.com/file?first=yes",
                        Query = new[] { new QueryModification(new Regex("\\.txt$"), "second", "no") }
                    },
                    new LinkTargetPreset(null),
                    filePath: "foo/bar.txt"
                )
            );
        }


        [Fact]
        public async Task ShouldAddTheQueryStringBeforeTheHashWhenQueryModificationMatches() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                "http://example.com/file?first=yes#L1-10",
                await CreateUrlAsync(
                    new PartialHandlerDefinition {
                        Url = "http://example.com/file#L1-10",
                        Query = new[] { new QueryModification(new Regex("\\.txt$"), "first", "yes") }
                    },
                    new LinkTargetPreset(null),
                    filePath: "foo/bar.txt"
                )
            );
        }


        private void SetRepositoryRoot(string repo) {
            _repository = new Repository(repo, _repository.Remote);
        }


        private void SetRemoteUrl(string url) {
            _repository = new Repository(_repository.Root, new Remote("origin", url));
        }


        private async Task<string> CreateUrlAsync(PartialHandlerDefinition definition, ILinkTarget target, string filePath = "file.txt") {
            return (
                await CreateHandler(definition).CreateUrlAsync(
                    _repository,
                    new FileInfo(filePath, null),
                    new LinkOptions(target)
                )
            ).Url;
        }


        private LinkHandler CreateHandler(PartialHandlerDefinition definition) {
            return new LinkHandler(
                new PublicHandlerDefinition(
                    "Test",
                    definition.BranchRef ?? BranchRefType.Abbreviated,
                    Array.Empty<string>(),
                    Parser.Parse(definition.Url ?? ""),
                    definition.Query ?? Array.Empty<QueryModification>(),
                    EmptyTemplate,
                    new ReverseSettings(
                        new Regex(""),
                        EmptyTemplate,
                        false,
                        new ReverseServerSettings(EmptyTemplate, EmptyTemplate, null),
                        new ReverseSelectionSettings(EmptyTemplate, null, null, null)
                    ),
                    new[] { definition.Server ?? new StaticServer("http://example.com", "ssh://example.com", null) }
                ),
                _settings,
                Git
            );
        }


        private class PartialHandlerDefinition {

            public string? Url { get; set; }


            public StaticServer? Server { get; set; }


            public BranchRefType? BranchRef { get; set; }


            public IReadOnlyList<QueryModification>? Query { get; set; }

        }

    }


    public class GetUrlInfoAsyncMethod : RepositoryTestBase {

        private StaticServer _server = new("http://example.com", "ssh://example.com", null);


        static GetUrlInfoAsyncMethod() {
            TemplateEngine.Initialize();
        }


        [Fact]
        public async Task ShouldReturnNullInStrictModeWhenTheUrlDoesNotMatchTheServer() {
            Assert.Null(
                await GetUrlInfoAsync(
                    new PartialReverseSettings { Pattern = ".+" },
                    "http://different.com/foo/bar.txt",
                    true
                )
            );
        }


        [Fact]
        public async Task ShouldReturnNullWhenThePatternDoesNotMatchTheUrlInStrictMode() {
            Assert.Null(
                await GetUrlInfoAsync(
                    new PartialReverseSettings { Pattern = "^https://.+" },
                    "http://example.com/foo/bar.txt",
                    true
                )
            );
        }


        [Fact]
        public async Task ShouldReturnNullWhenThePatternDoesNotMatchTheUrlInNonStrictMode() {
            Assert.Null(
              await GetUrlInfoAsync(
                    new PartialReverseSettings { Pattern = "^https://.+" },
                    "http://example.com/foo/bar.txt",
                    false
                )
            );
        }


        [Fact]
        public async Task ShouldReturnTheInfoWhenThePatternMatchesTheUrl() {
            Assert.Equal(
                new UrlInfo(
                    "bar.txt",
                    new StaticServer("http", "ssh", null),
                    new PartialSelectedRange(10, 20, 30, 40)),
                await GetUrlInfoAsync(
                    new PartialReverseSettings {
                        Pattern = "http://example\\.com/[^/]+/(?<file>.+)",
                        File = "{{ match.groups.file }}",
                        Server = new ReverseServerSettings(
                            Parser.Parse("http"),
                            Parser.Parse("ssh"),
                            null
                        ),
                        Selection = new ReverseSelectionSettings(
                            Parser.Parse("10"),
                            Parser.Parse("20"),
                            Parser.Parse("30"),
                            Parser.Parse("40")
                        )
                    },
                    "http://example.com/foo/bar.txt",
                    false
                ),
                UrlInfoComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldHandleInvalidSelectionProperties() {
            Assert.Equal(
                new UrlInfo(
                    "bar.txt",
                    new StaticServer("http", "ssh", null),
                    new PartialSelectedRange(10, null, null, null)
                ),
                await GetUrlInfoAsync(
                    new PartialReverseSettings {
                        Pattern = "http://example\\.com/[^/]+/(?<file>.+)",
                        File = "{{ match.groups.file }}",
                        Server = new ReverseServerSettings(
                            Parser.Parse("http"),
                            Parser.Parse("ssh"),
                            null
                        ),
                        Selection = new ReverseSelectionSettings(
                            Parser.Parse("10"),
                            Parser.Parse("x"),
                            Parser.Parse(""),
                            null
                        )
                    },
                    "http://example.com/foo/bar.txt",
                    false
                ),
                UrlInfoComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldProvideTheMatchingServerInfoToTheTemplates() {
            Assert.Equal(
                new UrlInfo(
                    "",
                    new StaticServer("http://example.com", "example.com", null),
                    new PartialSelectedRange(null, null, null, null)
                ),
                await GetUrlInfoAsync(
                    new PartialReverseSettings {
                        Pattern = "http://example\\.com/.+",
                        Server = new ReverseServerSettings(
                            Parser.Parse("{{ http }}"),
                            Parser.Parse("{{ ssh }}"),
                            null
                        )
                    },
                    "http://example.com/foo/bar.txt",
                    false
                ),
                UrlInfoComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldUseTheWebTemplateWhenThereIsOne() {
            _server = new StaticServer("http://example.com", "ssh://example.com", "http://web.example.com");

            Assert.Equal(
                new UrlInfo(
                    "",
                    new StaticServer(
                        "http://example.com",
                        "example.com",
                        "http://web.example.com"
                    ),
                    new PartialSelectedRange(null, null, null, null)
                ),
                await GetUrlInfoAsync(
                    new PartialReverseSettings {
                        Pattern = "http://(web\\.)?example\\.com/.+",
                        Server = new ReverseServerSettings(
                            Parser.Parse("{{ http }}"),
                            Parser.Parse("{{ ssh }}"),
                            Parser.Parse("{{ web }}")
                        )
                    },
                    "http://web.example.com/foo/bar.txt",
                    false
                ),
                UrlInfoComparer.Instance
            );
        }


        private async Task<UrlInfo?> GetUrlInfoAsync(PartialReverseSettings settings, string url, bool strict) {
            return await CreateHandler(settings).GetUrlInfoAsync(url, strict);
        }


        private LinkHandler CreateHandler(PartialReverseSettings reverse) {
            return new LinkHandler(
                new PublicHandlerDefinition(
                    "Test",
                    BranchRefType.Abbreviated,
                    Array.Empty<string>(),
                    EmptyTemplate,
                    Array.Empty<QueryModification>(),
                    EmptyTemplate,
                    new ReverseSettings(
                        new Regex(reverse.Pattern ?? ""),
                        Parser.Parse(reverse.File ?? ""),
                        false,
                        reverse.Server ?? new ReverseServerSettings(EmptyTemplate, EmptyTemplate, null),
                        reverse.Selection ?? new ReverseSelectionSettings(EmptyTemplate, null, null, null)
                    ),
                    new[] { _server }
                ),
                Substitute.For<ISettings>(),
                Git
            );
        }


        private class PartialReverseSettings {

            public string? Pattern { get; set; }


            public string? File { get; set; }


            public ReverseServerSettings? Server { get; set; }


            public ReverseSelectionSettings? Selection { get; set; }

        }


        private class UrlInfoComparer : IEqualityComparer<UrlInfo?> {

            public static UrlInfoComparer Instance { get; } = new();


            public bool Equals(UrlInfo? x, UrlInfo? y) {
                if (x is null) {
                    return y is null;
                }

                if (y is null) {
                    return false;
                }

                return string.Equals(x.Server.Http, y.Server.Http, StringComparison.Ordinal) &&
                    string.Equals(x.Server.Ssh, y.Server.Ssh, StringComparison.Ordinal) &&
                    string.Equals(x.FilePath, y.FilePath, StringComparison.Ordinal) &&
                    Nullable.Equals(x.Selection.StartLine, y.Selection.StartLine) &&
                    Nullable.Equals(x.Selection.StartColumn, y.Selection.StartColumn) &&
                    Nullable.Equals(x.Selection.EndLine, y.Selection.EndLine) &&
                    Nullable.Equals(x.Selection.EndColumn, y.Selection.EndColumn);
            }


            public int GetHashCode(UrlInfo? obj) {
                return 0;
            }

        }

    }

}
