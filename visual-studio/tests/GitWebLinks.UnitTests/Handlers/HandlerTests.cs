using Fluid;
using Newtonsoft.Json.Linq;
using NSubstitute;

namespace GitWebLinks;

public static class HandlerTests {

    public class CreateUrlAsyncMethod : TestBase {

        [HandlerFact]
        public async Task Http() {
            await RunRemoteTestAsync(Definition.Tests.CreateUrl.Remotes.Http);
        }


        [HandlerFact]
        public async Task HttpWithUsername() {
            await RunRemoteTestAsync(Definition.Tests.CreateUrl.Remotes.HttpWithUsername);
        }


        [HandlerFact]
        public async Task Ssh() {
            await RunRemoteTestAsync(Definition.Tests.CreateUrl.Remotes.Ssh);
        }


        [HandlerFact]
        public async Task SshWithProtocol() {
            await RunRemoteTestAsync(Definition.Tests.CreateUrl.Remotes.SshWithProtocol);
        }


        [HandlerFact]
        public async Task Spaces() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Spaces,
                new TestOptions { FileName = TestFileNameWithSpaces }
            );
        }


        [HandlerFact]
        public async Task Branch() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Branch,
                new TestOptions { Type = LinkType.CurrentBranch, Branch = TestBranchName }
            );
        }


        [HandlerFact]
        public async Task Commit() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Commit,
                new TestOptions { Type = LinkType.Commit }
            );
        }


        [HandlerFact]
        public async Task DefaultBranch() {
            await RunTestAsync(
                Definition.Tests.CreateUrl.Remotes.Http,
                Definition.Tests.CreateUrl.Remotes.Settings,
                Definition.Tests.CreateUrl.Remotes.Result,
                new TestOptions {
                    Type = LinkType.DefaultBranch,
                    RemoteName = "origin",
                    // Run with a different branch to confirm that the remote's default branch is used.
                    Branch = TestBranchName
                }
            );
        }


        [HandlerCustomFact]
        public async Task Custom(string customTestName) {
            CustomTest test;
            SelectedRange? selection;


            test = Definition.Tests.CreateUrl.Misc.First((x) => x.Name == customTestName);

            if (test.Selection is not null) {
                selection = new SelectedRange(
                    test.Selection.StartLine,
                    test.Selection.StartColumn,
                    test.Selection.EndLine,
                    test.Selection.EndColumn
                );

            } else {
                selection = null;
            }

            await RunTestAsync(
                test.Remote,
                test.Settings,
                test.Result,
                new TestOptions {
                    Branch = test.Branch,
                    FileName = test.FileName,
                    Selection = selection,
                    Type = test.LinkType
                }
            );
        }


        [HandlerFact]
        public async Task ZeroWidthSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.Point,
                (test) => new SelectedRange(test.Line, 1, test.Line, 1)
            );
        }


        [HandlerFact]
        public async Task SingleLineSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.SingleLine,
                (test) => new SelectedRange(test.Line, test.StartColumn, test.Line, test.EndColumn)
            );
        }


        [HandlerFact]
        public async Task MultiLineSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.MultipleLines,
                (test) => new SelectedRange(test.StartLine, test.StartColumn, test.EndLine, test.EndColumn)
            );
        }


        private async Task RunRemoteTestAsync(string remote) {
            await RunTestAsync(
                remote,
                Definition.Tests.CreateUrl.Remotes.Settings,
                Definition.Tests.CreateUrl.Remotes.Result,
                new TestOptions()
            );
        }


        private async Task RunUrlTestAsync(UrlTest test, TestOptions? options = null) {
            await RunTestAsync(test.Remote, test.Settings, test.Result, options);
        }


        private async Task RunSelectionTestAsync<T>(T test, Func<T, SelectedRange> selectionFactory) where T : ISelectionTest {
            await RunTestAsync(
                Definition.Tests.CreateUrl.Selection.Remote,
                Definition.Tests.CreateUrl.Selection.Settings,
                test.Result,
                new TestOptions { Selection = selectionFactory(test) }
            );
        }


        private async Task RunTestAsync(string remote, Dictionary<string, JToken> settings, string result, TestOptions? options = null) {
            Repository repository;
            SelectedLinkHandler? match;
            string? link;


            if (options is null) {
                options = new TestOptions();
            }

            result = await PrepareTestAsync(settings, result, options);

            repository = new Repository(RepositoryRoot, new Remote("origin", new[] { remote }));

            match = await Provider.SelectAsync(repository);

            if (match is null) {
                throw new Xunit.Sdk.XunitException("A handler was not found.");
            }

            Assert.Equal(Definition.Name, match.Handler.Name);
            Assert.Equal(remote, match.RemoteUrl);

            link = (
                await match.Handler.CreateUrlAsync(
                    repository,
                    match.RemoteUrl,
                    new FileInfo(Path.Combine(RepositoryRoot, options.FileName ?? TestFileName), options.Selection),
                    new LinkOptions(new LinkTargetPreset(options.Type ?? LinkType.CurrentBranch))
                )
            ).Url;

            Assert.Equal(result, link);
        }


        private class TestOptions : TestBaseOptions {

            public string? FileName { get; set; }


            public SelectedRange? Selection { get; set; }


            public LinkType? Type { get; set; }

        }

    }


    public class GetUrlInfoAsyncMethod : TestBase {

        [HandlerFact]
        public async Task Http() {
            // The remote URL is only used to verify the result,
            // and is normalized before comparison, so we'll only use
            // the normal HTTP URL and not the one with the username in it.
            await RunTestAsync(
                Definition.Tests.CreateUrl.Remotes.Http,
                Definition.Tests.CreateUrl.Remotes.Settings,
                Definition.Tests.CreateUrl.Remotes.Result
            );
        }


        [HandlerFact]
        public async Task Ssh() {
            // The remote URL is only used to verify the result,
            // and is normalized before comparison, so we'll only use
            // the normal SSH URL and not the one with the protocol in it.
            await RunTestAsync(
                Definition.Tests.CreateUrl.Remotes.Ssh,
                Definition.Tests.CreateUrl.Remotes.Settings,
                Definition.Tests.CreateUrl.Remotes.Result
            );
        }


        [HandlerFact]
        public async Task Spaces() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Spaces,
                new ReverseTestOptions {
                    FileName = TestFileNameWithSpaces
                }
            );
        }


        [HandlerFact]
        public async Task Branch() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Branch,
                new ReverseTestOptions {
                    Type = LinkType.CurrentBranch,
                    Branch = TestBranchName,
                    FileMayStartWithBranch = Definition.Reverse.FileMayStartWithBranch
                }
            );
        }


        [HandlerFact]
        public async Task Commit() {
            await RunUrlTestAsync(
                Definition.Tests.CreateUrl.Commit,
                new ReverseTestOptions {
                    Type = LinkType.Commit
                }
            );
        }


        [HandlerCustomFact]
        public async Task Custom(string customTestName) {
            CustomTest test;
            PartialSelectedRange? selection;


            test = Definition.Tests.CreateUrl.Misc.First((x) => x.Name == customTestName);

            if (test.Selection is not null) {
                selection = new PartialSelectedRange(
                    test.Selection.StartLine,
                    test.Selection.StartColumn,
                    test.Selection.EndLine,
                    test.Selection.EndColumn
                );

            } else {
                selection = null;
            }

            await RunTestAsync(
                test.Remote,
                test.Settings,
                test.Result,
                new ReverseTestOptions {
                    Branch = test.Branch,
                    FileMayStartWithBranch = Definition.Reverse.FileMayStartWithBranch,
                    FileName = test.FileName,
                    Selection = selection,
                    Type = test.LinkType
                }
            );
        }


        [HandlerFact]
        public async Task ZeroWidthSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.Point,
                (test) => test.ReverseRange ?? new PartialSelectedRange(test.Line, null, null, null)
            );
        }


        [HandlerFact]
        public async Task SingleLineSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.SingleLine,
                (test) => test.ReverseRange ?? new PartialSelectedRange(test.Line, null, null, null)
            );
        }

        [HandlerFact]
        public async Task MultiLineSelection() {
            await RunSelectionTestAsync(
                Definition.Tests.CreateUrl.Selection.MultipleLines,
                (test) => test.ReverseRange ?? new PartialSelectedRange(test.StartLine, null, test.EndLine, null)
            );
        }


        private async Task RunUrlTestAsync(UrlTest test, ReverseTestOptions? options = null) {
            await RunTestAsync(
                test.Remote,
                test.Settings,
                test.Result,
                options
            );
        }


        private async Task RunSelectionTestAsync<T>(T test, Func<T, PartialSelectedRange> selectionFactory) where T : ISelectionTest {
            await RunTestAsync(
                Definition.Tests.CreateUrl.Selection.Remote,
                Definition.Tests.CreateUrl.Selection.Settings,
                test.Result,
                new ReverseTestOptions {
                    Selection = selectionFactory(test)
                }
            );
        }


        private async Task RunTestAsync(string remote, Dictionary<string, JToken> settings, string url, ReverseTestOptions? options = null) {
            IReadOnlyCollection<UrlInfo> infos;
            UrlInfo info;

            if (options is null) {
                options = new ReverseTestOptions();
            }

            if (options.FileName is null) {
                options.FileName = TestFileName;
            }

            if (options.Selection is null) {
                options.Selection = new PartialSelectedRange(null, null, null, null);
            }

            url = await PrepareTestAsync(settings, url, options);

            infos = await Provider.GetUrlInfoAsync(url);
            info = Assert.Single(infos);

            if (info.FilePath != options.FileName) {
                // If the file name can start with the branch
                // name, then verify that the file name at
                // least ends with the expected file name.
                if (options.FileMayStartWithBranch) {
                    Assert.EndsWith($"/{options.FileName}", info.FilePath, StringComparison.OrdinalIgnoreCase);
                } else {
                    Assert.Equal(options.FileName, info.FilePath);
                }
            }

            if (remote.StartsWith("http", StringComparison.Ordinal)) {
                Assert.Equal(UrlHelpers.Normalize(info.Server.Http), UrlHelpers.Normalize(remote));
            } else if (info.Server.Ssh is not null) {
                Assert.Equal(UrlHelpers.Normalize(info.Server.Ssh), UrlHelpers.Normalize(remote));
            }

            Assert.Equal(options.Selection, info.Selection, PartialSelectedRangeComparer.Instance);
        }


        private class ReverseTestOptions : TestBaseOptions {

            public string? FileName { get; set; }


            public PartialSelectedRange? Selection { get; set; }


            public LinkType? Type { get; set; }


            public bool FileMayStartWithBranch { get; set; }

        }


        private class PartialSelectedRangeComparer : IEqualityComparer<PartialSelectedRange> {

            public static PartialSelectedRangeComparer Instance { get; } = new();


            public bool Equals(PartialSelectedRange x, PartialSelectedRange y) {
                return Nullable.Equals(x.StartLine, y.StartLine) &&
                    Nullable.Equals(x.StartColumn, y.StartColumn) &&
                    Nullable.Equals(x.EndLine, y.EndLine) &&
                    Nullable.Equals(x.EndColumn, y.EndColumn);
            }


            public int GetHashCode(PartialSelectedRange obj) {
                return 0;
            }

        }

    }


    public abstract class TestBase : RepositoryTestBase, IHandlerTestClass {

        protected const string TestFileName = "src/file.txt";
        protected const string TestFileNameWithSpaces = "src/path spaces/file spaces.txt";
        protected const string TestBranchName = "feature/test";


        private readonly ISettings _settings;
        private readonly Dictionary<string, IReadOnlyList<StaticServer>> _servers;
        private readonly Dictionary<string, object> _handlerSettings;
        private HandlerTestDefinition _definition;
        private string _repositoryRoot;


        static TestBase() {
            TemplateEngine.Initialize();
        }


        protected TestBase() {
            _handlerSettings = new Dictionary<string, object>();
            _servers = new Dictionary<string, IReadOnlyList<StaticServer>>();

            _settings = Substitute.For<ISettings>();
            _settings.GetDefaultBranchAsync().Returns("");
            _settings.GetDefaultLinkTypeAsync().Returns(LinkType.Commit);

            _settings.GetHandlerSettingAsync(Arg.Any<string>()).Returns(
                (args) => {
                    _handlerSettings.TryGetValue(args.ArgAt<string>(0), out object value);
                    return value;
                }
            );

            _settings.GetServersAsync(Arg.Any<string>()).Returns(
                (args) => {
                    _servers.TryGetValue(args.ArgAt<string>(0), out IReadOnlyList<StaticServer>? value);
                    return Task.FromResult(value ?? Array.Empty<StaticServer>());
                }
            );

            Provider = new(_settings, Git, NullLogger.Instance);

            _repositoryRoot = "";
            _definition = default!;
        }


        protected LinkHandlerProvider Provider { get; }


        protected HandlerTestDefinition Definition => _definition;


        protected string RepositoryRoot => _repositoryRoot;


        public void SetDefinition(HandlerTestDefinition definition) {
            _definition = definition;
        }


        protected async Task<string> PrepareTestAsync(Dictionary<string, JToken>? settings, string url, TestBaseOptions options) {
            SetupSettings(settings);

            _repositoryRoot = CreateDirectory("repo");
            await SetupRepositoryAsync(_repositoryRoot);

            if (options.Branch is not null) {
                await Git.ExecuteAsync(_repositoryRoot, "checkout", "-b", options.Branch);
            }

            if (options.RemoteName is not null) {
                string origin;


                origin = CreateDirectory("origin");

                await SetupRemoteAsync(_repositoryRoot, origin, options.RemoteName);
                await Git.ExecuteAsync(_repositoryRoot, "remote", "set-head", options.RemoteName, "master");
            }

            // Treat the test URL as a template and allow
            // the current commit hash to be used in the result.
            return new FluidParser().Parse(url).Render(
                TemplateData
                    .Create()
                    .Add("commit", string.Concat(await Git.ExecuteAsync(_repositoryRoot, "rev-parse", "HEAD")).Trim())
                    .AsTemplateContext()
            );
        }


        private void SetupSettings(Dictionary<string, JToken>? settings) {
            ApplySettings(_definition.Tests.Settings);

            if (settings is not null) {
                ApplySettings(settings);
            }
        }


        private void ApplySettings(Dictionary<string, JToken> settings) {
            foreach (KeyValuePair<string, JToken> item in settings) {
                switch (item.Key) {
                    case "azureDevOpsServer":
                    case "bitbucketServer":
                    case "gitea":
                    case "gitHubEnterprise":
                    case "gitiles":
                    case "gitLabEnterprise":
                        _servers[item.Key] = CreateStaticServers(item.Value);
                        break;

                    case "useGitHubDev":
                        _handlerSettings["useGitHubDev"] = item.Value.ToObject<bool>();
                        break;

                }
            }
        }


        private static List<StaticServer> CreateStaticServers(JToken value) {
            return Convert(value, new[] { new { Http = "", Ssh = "", Web = "" } })
                .Select((x) => new StaticServer(x.Http, x.Ssh, x.Web))
                .ToList();

            static T Convert<T>(JToken value, T witness) => value.ToObject<T>()!;
        }

    }


    public class TestBaseOptions {

        public string? Branch { get; set; }


        public string? RemoteName { get; set; }

    }

}
