using DotLiquid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class RemoteServerTests {

    public class SingleStaticServer : TestBase {

        public SingleStaticServer() : base(
            new(
                new StaticServer(
                    "http://example.com:8000",
                    "ssh://git@example.com:9000",
                    null
                )
            )
        ) { }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:10000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldReturnTheServerWhenMatchingToTheHttpAddress() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null));
        }


        [Fact]
        public async Task ShouldReturnTheServerwhenMatchingToTheSshAddressWithTheSshProtocol() {
            Url = "ssh://git@example.com:9000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null),
                null
            );
        }


        [Fact]
        public async Task ShouldReturnTheServerWhenMatchingToTheSshAddressWithoutTheSshProtocol() {
            Url = "git@example.com:9000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null),
                null
            );
        }


        [Fact]
        public async Task ShouldMatchTheWebAddressWhenThereIsAWebAddress() {
            Server = new RemoteServer(
                new StaticServer(
                    "http://example.com:8000",
                    "ssh://git@example.com:9000",
                    "http://other.com:8000"
                )
            );

            Url = "http://other.com:8000/foo/bar";

            await MatchAsync(
                null,
                new StaticServer(
                    "http://example.com:8000",
                    "ssh://git@example.com:9000",
                    "http://other.com:8000"
                )
            );
        }

    }


    public class MultipleStaticServers : TestBase {

        public MultipleStaticServers() : base(
            new(
                new IServer[] {
                    new StaticServer("http://example.com:8000","ssh://git@example.com:9000", null),
                    new StaticServer("http://test.com:6000","ssh://git@test.com:7000", null)
                }
            )
        ) { }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:10000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheHttpAddress() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null)
            );

            Url = "http://test.com:6000/foo/bar";
            await MatchAsync(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", null)
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddressWithTheSshProtocol() {
            Url = "ssh://git@example.com:9000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null),
                null
            );

            Url = "ssh://git@test.com:7000/foo/bar";
            await MatchAsync(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", null),
                null
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddressWithoutTheSshProtocol() {
            Url = ("git@example.com:9000/foo/bar");
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null),
                null
            );

            Url = ("git@test.com:7000/foo/bar");
            await MatchAsync(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", null),
                null
            );
        }


        [Fact]
        public async Task ShouldMatchTheWebAddressWhenThereIsAWebAddress() {
            Server = new RemoteServer(
                new IServer[] {
                    new StaticServer(
                        "http://example.com:8000",
                        "ssh://git@example.com:9000",
                        "http://web.example.com"
                    ),
                    new StaticServer(
                        "http://test.com:6000",
                        "ssh://git@test.com:7000",
                        "http://web.test.com"
                    )
                }
            );

            Url = "http://web.example.com/foo/bar";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://example.com:8000",
                    "ssh://git@example.com:9000",
                    "http://web.example.com"
                )
            );

            Url = "http://web.test.com/foo/bar";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://test.com:6000",
                    "ssh://git@test.com:7000",
                    "http://web.test.com"
                )
            );
        }
    }


    public class SingleDynamicServer : TestBase {

        public SingleDynamicServer() : base(
            new RemoteServer(
                new DynamicServer(
                    new Regex("http://(.+)\\.example\\.com:8000"),
                    Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                    Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                    null,
                    null
                )
            )
        ) { }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServer() {
            Url = "http://foo.example.com:8000/bar/meep";
            await MatchAsync(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo", null)
            );
        }

        [Fact]
        public async Task ShouldMatchTheWebAddressWhenThereIsAWebAddress() {
            Server = new RemoteServer(
                new DynamicServer(
                    new Regex("http://(.+)\\.example\\.com:8000"),
                    Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                    Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                    new Regex("http://(.+)\\.test\\.com:8000"),
                    Template.Parse("http://test.com:8000/repos/{{ match[1] }}")
                )
            );

            Url = "http://foo.test.com:8000/bar/meep";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://example.com:8000/repos/foo",
                    "ssh://git@example.com:9000/_foo",
                    "http://test.com:8000/repos/foo"
                )
            );
        }

    }


    public class MultipleDynamicServers : TestBase {

        public MultipleDynamicServers() : base(
            new RemoteServer(
                new IServer[] {
                    new DynamicServer(
                        new Regex("http://(.+)\\.example\\.com:8000"),
                        Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                        Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                        null,
                        null
                    ),
                    new DynamicServer(
                        new Regex("ssh://git@example\\.com:9000/_([^/]+)"),
                        Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                        Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                        new Regex("^$"), // This server should only match SSH remote URLs.
                        null
                    )
                }
            )
        ) { }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServer() {
            Url = "http://foo.example.com:8000/bar/meep";
            await MatchAsync(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo", null)
            );

            Url = "ssh://git@example.com:9000/_foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo", null),
                null
            );
        }


        [Fact]
        public async Task ShouldMatchTheWebAddressWhenThereIsAWebAddress() {
            Server = new RemoteServer(
                new IServer[] {
                    new DynamicServer(
                        new Regex("http://(.+)\\.example\\.com:8000"),
                        Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                        Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                        new Regex("http://(.+)\\.test\\.com:8000"),
                        Template.Parse("http://test.com:8000/repos/{{ match[1] }}")
                    ),
                    new DynamicServer(
                        new Regex("ssh://git@example\\.com:9000/_([^/]+)"),
                        Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                        Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                        new Regex("http://(.+)\\.other\\.com:8000"),
                        Template.Parse("http://other.com:8000/repos/{{ match[1] }}")
                    )
                }
            );

            Url = "http://foo.test.com:8000/bar/meep";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://example.com:8000/repos/foo",
                    "ssh://git@example.com:9000/_foo",
                    "http://test.com:8000/repos/foo"
                )
            );

            Url = "http://foo.other.com:8000/bar/meep";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://example.com:8000/repos/foo",
                    "ssh://git@example.com:9000/_foo",
                    "http://other.com:8000/repos/foo"
                )
            );
        }

    }


    public class MixedStaticAndDynamicServers : TestBase {

        public MixedStaticAndDynamicServers() : base(
            new RemoteServer(
                new IServer[] {
                    new DynamicServer(
                        new Regex("http://(.+)\\.example\\.com:8000"),
                        Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                        Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}"),
                        null,
                        null
                    ),
                    new StaticServer(
                        "http://example.com:10000",
                        "ssh://git@example.com:11000",
                        null
                    )
                }
            )
        ) { }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:7000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheStaticServer() {
            Url = "http://example.com:10000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:10000", "ssh://git@example.com:11000", null)
            );
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServerWhenMatchingToTheDynamicServer() {
            Url = "http://foo.example.com:8000/bar/meep";
            await MatchAsync(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo", null)
            );
        }

    }


    public class StaticServerFactory : TestBase {

        private IEnumerable<StaticServer> _source;



        public StaticServerFactory() : base(new RemoteServer(new StaticServer("", null, null))) {
            _source = new[] {
                new StaticServer("http://example.com:8000","ssh://git@example.com:9000", null),
                new StaticServer("http://test.com:6000","ssh://git@test.com:7000", "http://web.test.com")
            };
            Server = new RemoteServer(() => Task.FromResult(_source));
        }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Url = "http://example.com:9000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheHttpAddress() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null)
            );

            Url = "http://test.com:6000/foo/bar";
            await MatchAsync(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", "http://web.test.com"),
                null
            );

            Url = "http://web.test.com/foo/bar";
            await MatchAsync(
                null,
                new StaticServer(
                    "http://test.com:6000",
                    "ssh://git@test.com:7000",
                    "http://web.test.com"
                )
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddress() {
            Url = "ssh://git@example.com:9000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null),
                null
            );

            Url = "ssh://git@test.com:7000/foo/bar";
            await MatchAsync(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", "http://web.test.com"),
                null
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenTheRemoteUrlIsAnHttpAddresAndTheServerHasNoSshUrl() {
            _source = new[] { new StaticServer("http://example.com:8000", null, null) };

            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", null, null)
            );
        }


        [Fact]
        public async Task ShouldNotReturnMatchWhenTheRemoteUrlIsAnSshAddressAndTheServerHNoSshURL() {
            _source = new[] { new StaticServer("http://example.com:8000", null, null) };

            Url = "ssh://git@test.com:7000/foo/bar";
            await MatchAsync(null);
        }


        [Fact]
        public async Task ShouldNotCacheTheServersReturnedFromTheFactory() {
            Url = "http://example.com:8000/foo/bar";
            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null)
            );

            _source = new[] { new StaticServer("http://test.com:6000", "ssh://git@test.com:7000", null) };

            await MatchAsync(null);

            _source = new[] { new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null) };

            await MatchAsync(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000", null)
            );
        }

    }


    private class StaticServerComparer : IEqualityComparer<StaticServer?> {

        public static StaticServerComparer Instance { get; } = new StaticServerComparer();


        public bool Equals(StaticServer? x, StaticServer? y) {
            if (x is null) {
                return y is null;
            }

            if (y is null) {
                return false;
            }

            return string.Equals(x.Http, y.Http, StringComparison.Ordinal) &&
                   string.Equals(x.Ssh, y.Ssh, StringComparison.Ordinal);
        }


        public int GetHashCode(StaticServer? obj) {
            return 0;
        }

    }


    public abstract class TestBase {

        protected TestBase(RemoteServer defaultServer) {
            Server = defaultServer;
        }


        protected RemoteServer Server { get; set; }


        protected string Url { get; set; } = "";


        protected async Task MatchAsync(StaticServer? expectedMatch) {
            await MatchAsync(expectedMatch, expectedMatch);
        }


        protected async Task MatchAsync(
            StaticServer? expectedRemoteMatch,
            StaticServer? expectedWebMatch
        ) {
            Assert.Equal(
                expectedRemoteMatch,
                await Server.MatchRemoteUrlAsync(Url),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                expectedWebMatch,
                await Server.MatchWebUrlAsync(Url),
                StaticServerComparer.Instance
            );
        }

    }

}
