#nullable enable

using DotLiquid;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace GitWebLinks;

public class RemoteServer {

    private readonly List<AsyncMatcher> _matchers;


    public RemoteServer(IServer server) {
        _matchers = new List<AsyncMatcher> { CreateMatcher(server) };
    }


    public RemoteServer(IEnumerable<IServer> servers) {
        _matchers = servers.Select((x) => CreateMatcher(x)).ToList();
    }


    public RemoteServer(Func<Task<IEnumerable<StaticServer>>> serverFactory) {
        _matchers = new List<AsyncMatcher> { CreateLazyStaticServerMatcher(serverFactory) };
    }


    private static AsyncMatcher CreateMatcher(IServer server) {
        Matcher matcher;


        if (server is DynamicServer dynamicServer) {
            matcher = CreateDynamicServerMatcher(dynamicServer);
        } else {
            matcher = CreateStaticServerMatcher((StaticServer)server);
        }

        return (x) => Task.FromResult(matcher(x));
    }


    private static Matcher CreateDynamicServerMatcher(DynamicServer server) {
        return (url) => {
            Match match;


            match = server.Pattern.Match(url);

            if (match.Success) {
                Hash hash;


                // The URL matched the pattern. Render the templates to get the HTTP
                // and SSH URLs, making the match available for the templates to use.
                hash = TemplateData.Create().Add(match).ToHash();

                return new StaticServer(
                    server.Http.Render(hash),
                    server.Ssh.Render(hash)
                );
            }

            return null;
        };
    }


    private static Matcher CreateStaticServerMatcher(StaticServer server) {
        return (url) => IsMatch(url, server) ? server : null;
    }


    private static AsyncMatcher CreateLazyStaticServerMatcher(Func<Task<IEnumerable<StaticServer>>> factory) {
        return async (url) => (await factory()).Where((x) => IsMatch(url, x)).FirstOrDefault();
    }


    private static bool IsMatch(string url, StaticServer server) {
        url = UrlHelpers.Normalize(url);

        if (url.StartsWith(UrlHelpers.Normalize(server.Http), StringComparison.Ordinal)) {
            return true;
        }

        if ((server.Ssh is not null) && url.StartsWith(UrlHelpers.Normalize(server.Ssh), StringComparison.Ordinal)) {
            return true;
        }

        return false;
    }


    public async Task<StaticServer?> MatchAsync(string url) {
        foreach (AsyncMatcher matcher in _matchers) {
            StaticServer? server;


            server = await matcher(url);

            if (server is not null) {
                return server;
            }
        }

        return null;
    }


    private delegate Task<StaticServer?> AsyncMatcher(string url);


    private delegate StaticServer? Matcher(string url);

}
