#nullable enable

using DotLiquid;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace GitWebLinks;

public class RemoteServer {

    private readonly List<Matcher> _matchers;


    public RemoteServer(IServer server) {
        _matchers = new List<Matcher> { CreateMatcher(server) };
    }


    public RemoteServer(IEnumerable<IServer> servers) {
        _matchers = servers.Select((x) => CreateMatcher(x)).ToList();
    }


    public RemoteServer(Func<Task<IEnumerable<StaticServer>>> serverFactory) {
        _matchers = new List<Matcher> { CreateLazyStaticServerMatcher(serverFactory) };
    }


    private static Matcher CreateMatcher(IServer server) {
        if (server is DynamicServer dynamicServer) {
            return CreateDynamicServerMatcher(dynamicServer);
        } else {
            return CreateStaticServerMatcher((StaticServer)server);
        }
    }


    private static Matcher CreateDynamicServerMatcher(DynamicServer server) {
        return new Matcher(
            Create(server.RemotePattern),
            Create(server.WebPattern ?? server.RemotePattern)
        );

        UrlMatcher Create(Regex pattern) {
            return (url) => {
                Match match;
                StaticServer? result;


                match = pattern.Match(url);

                if (match.Success) {
                    Hash hash;


                    // The URL matched the pattern. Render the templates to get the HTTP
                    // and SSH URLs, making the match available for the templates to use.
                    hash = TemplateData.Create().Add(match).ToHash();

                    result = new StaticServer(
                        server.Http.Render(hash),
                        server.Ssh.Render(hash),
                        server.Web?.Render(hash)
                    );

                } else {
                    result = null;
                }

                return Task.FromResult(result);
            };
        }
    }


    private static Matcher CreateStaticServerMatcher(StaticServer server) {
        return new Matcher(
            (url) => Task.FromResult(IsRemoteMatch(url, server) ? server : null),
            (url) => Task.FromResult(IsWebMatch(url, server) ? server : null)
        );
    }


    private static Matcher CreateLazyStaticServerMatcher(Func<Task<IEnumerable<StaticServer>>> factory) {
        return new Matcher(
            Create(IsRemoteMatch),
            Create(IsWebMatch)
        );

        UrlMatcher Create(Func<string, StaticServer, bool> test) {
            return async (url) => (await factory()).Where((x) => test(url, x)).FirstOrDefault();
        }
    }


    private static bool IsRemoteMatch(string remoteUrl, StaticServer server) {
        remoteUrl = UrlHelpers.Normalize(remoteUrl);

        if (remoteUrl.StartsWith(UrlHelpers.Normalize(server.Http), StringComparison.Ordinal)) {
            return true;
        }

        if ((server.Ssh is not null) && remoteUrl.StartsWith(UrlHelpers.Normalize(server.Ssh), StringComparison.Ordinal)) {
            return true;
        }

        return false;
    }


    private static bool IsWebMatch(string webUrl, StaticServer server) {
        return UrlHelpers
            .Normalize(webUrl)
            .StartsWith(UrlHelpers.Normalize(server.Web ?? server.Http), StringComparison.Ordinal);
    }


    public Task<StaticServer?> MatchRemoteUrlAsync(string remoteUrl) {
        return MatchUrlAsync(remoteUrl, static (x) => x.Remote);
    }


    public Task<StaticServer?> MatchWebUrlAsync(string webUrl) {
        return MatchUrlAsync(webUrl, static (x) => x.Web);
    }


    private async Task<StaticServer?> MatchUrlAsync(
        string url,
        Func<Matcher, UrlMatcher> selectUrlMatcher
    ) {
        foreach (Matcher matcher in _matchers) {
            StaticServer? server;


            server = await selectUrlMatcher(matcher)(url);

            if (server is not null) {
                return server;
            }
        }

        return null;
    }


    private delegate Task<StaticServer?> UrlMatcher(string url);


    private class Matcher {

        public Matcher(UrlMatcher remote, UrlMatcher web) {
            Remote = remote;
            Web = web;
        }


        public UrlMatcher Remote { get; }


        public UrlMatcher Web { get; }

    }

}
