using DotLiquid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class RemoteServerTests {

    public class SingleStaticServer {

        private readonly RemoteServer _server = new(
            new StaticServer(
                "http://example.com:8000",
                "ssh://git@example.com:9000"
            )
        );


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:10000/foo/bar"));
        }


        [Fact]
        public async Task ShouldReturnTheServerWhenMatchingToTheHttpAddress() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheServerwhenMatchingToTheSshAddressWithTheSshProtocol() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("ssh://git@example.com:9000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheServerWhenMatchingToTheSshAddressWithoutTheSshProtocol() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("git@example.com:9000/foo/bar"),
                StaticServerComparer.Instance
            );
        }

    }


    public class MultipleStaticServers {

        private readonly RemoteServer _server = new(
            new IServer[] {
                new StaticServer("http://example.com:8000","ssh://git@example.com:9000"),
                new StaticServer("http://test.com:6000","ssh://git@test.com:7000")
            }
        );


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:10000/foo/bar"));
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheHttpAddress() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000"),
                await _server.MatchAsync("http://test.com:6000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddressWithTheSshProtocol() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("ssh://git@example.com:9000/foo/bar"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000"),
                await _server.MatchAsync("ssh://git@test.com:7000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddressWithoutTheSshProtocol() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("git@example.com:9000/foo/bar"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000"),
                await _server.MatchAsync("git@test.com:7000/foo/bar"),
                StaticServerComparer.Instance
            );
        }

    }


    public class SingleDynamicServer {

        private readonly RemoteServer _server = new(
            new DynamicServer(
                new Regex("http://(.+)\\.example\\.com:8000"),
                Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}")
            )
        );


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:8000/foo/bar"));
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServer() {
            Assert.Equal(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo"),
                await _server.MatchAsync("http://foo.example.com:8000/bar/meep"),
                StaticServerComparer.Instance
            );
        }

    }


    public class MultipleDynamicServers {

        private readonly RemoteServer _server = new(
            new IServer[] {
                new DynamicServer(
                    new Regex("http://(.+)\\.example\\.com:8000"),
                    Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                    Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}")
                ),
                new DynamicServer(
                    new Regex("ssh://git@example\\.com:9000/_([^/]+)"),
                    Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                    Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}")
                )
            }
        );


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:8000/foo/bar"));
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServer() {
            Assert.Equal(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo"),
                await _server.MatchAsync("http://foo.example.com:8000/bar/meep"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo"),
                await _server.MatchAsync("ssh://git@example.com:9000/_foo/bar"),
                StaticServerComparer.Instance
            );
        }

    }


    public class MixedStaticAndDynamicServers {

        private readonly RemoteServer _server = new(
            new IServer[] {
                new DynamicServer(
                    new Regex("http://(.+)\\.example\\.com:8000"),
                    Template.Parse("http://example.com:8000/repos/{{ match[1] }}"),
                    Template.Parse("ssh://git@example.com:9000/_{{ match[1] }}")
                ),
                new StaticServer(
                    "http://example.com:10000",
                    "ssh://git@example.com:11000"
                )
            }
        );


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:7000/foo/bar"));
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheStaticServer() {
            Assert.Equal(
                new StaticServer("http://example.com:10000", "ssh://git@example.com:11000"),
                await _server.MatchAsync("http://example.com:10000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldCreateTheDetailsOfTheMatchingServerWhenMatchingToTheDynamicServer() {
            Assert.Equal(
                new StaticServer("http://example.com:8000/repos/foo", "ssh://git@example.com:9000/_foo"),
                await _server.MatchAsync("http://foo.example.com:8000/bar/meep"),
                StaticServerComparer.Instance
            );
        }

    }


    public class StaticServerFactory {

        private IEnumerable<StaticServer> _source;
        private readonly RemoteServer _server;



        public StaticServerFactory() {
            _source = new[] {
                new StaticServer("http://example.com:8000","ssh://git@example.com:9000"),
                new StaticServer("http://test.com:6000","ssh://git@test.com:7000")
            };

            _server = new RemoteServer(() => Task.FromResult(_source));
        }


        [Fact]
        public async Task ShouldReturnNullWhenThereIsNoMatch() {
            Assert.Null(await _server.MatchAsync("http://example.com:9000/foo/bar"));
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheHttpAddress() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000"),
                await _server.MatchAsync("http://test.com:6000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenMatchingToTheSshAddress() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("ssh://git@example.com:9000/foo/bar"),
                StaticServerComparer.Instance
            );

            Assert.Equal(
                new StaticServer("http://test.com:6000", "ssh://git@test.com:7000"),
                await _server.MatchAsync("ssh://git@test.com:7000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldReturnTheMatchingServerWhenTheRemoteUrlIsAnHttpAddresAndTheServerHasNoSshUrl() {
            _source = new[] { new StaticServer("http://example.com:8000", null) };

            Assert.Equal(
                new StaticServer("http://example.com:8000", null),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldNotReturnMatchWhenTheRemoteUrlIsAnSshAddressAndTheServerHNoSshURL() {
            _source = new[] { new StaticServer("http://example.com:8000", null) };

            Assert.Null(await _server.MatchAsync("ssh://git@test.com:7000/foo/bar"));
        }


        [Fact]
        public async Task ShouldNotCacheTheServersReturnedFromTheFactory() {
            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
            );

            _source = new[] { new StaticServer("http://test.com:6000", "ssh://git@test.com:7000") };

            Assert.Null(await _server.MatchAsync("http://example.com:8000/foo/bar"));

            _source = new[] { new StaticServer("http://example.com:8000", "ssh://git@example.com:9000") };

            Assert.Equal(
                new StaticServer("http://example.com:8000", "ssh://git@example.com:9000"),
                await _server.MatchAsync("http://example.com:8000/foo/bar"),
                StaticServerComparer.Instance
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

}
