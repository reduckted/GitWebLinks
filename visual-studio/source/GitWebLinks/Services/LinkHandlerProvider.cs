#nullable enable

using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GitWebLinks;

public class LinkHandlerProvider {

    private readonly IReadOnlyCollection<ILinkHandler> _handlers;
    private readonly ILogger _logger;


    public LinkHandlerProvider(ISettings settings, Git git, ILogger logger) {
        _logger = logger;

        _handlers = DefinitionProvider
            .GetDefinitions()
            .OrderBy((x) => x.Name)
            .Select((x) => new LinkHandler(x, settings, git))
            .ToList();
    }


    public async Task<ILinkHandler?> SelectAsync(Repository repository) {
        if (repository.Remote is null) {
            return null;
        }

        await _logger.LogAsync($"Finding a handler for repository {repository.Remote}.");

        foreach (ILinkHandler handler in _handlers) {
            await _logger.LogAsync($"Testing '{handler.Name}");

            if (await handler.IsMatchAsync(repository.Remote.Url)) {
                await _logger.LogAsync($"Handler '{handler.Name}' is a match.");
                return handler;
            }
        }

        await _logger.LogAsync("No handler found.");
        return null;
    }


    public async Task<IReadOnlyCollection<UrlInfo>> GetUrlInfoAsync(string url) {
        IReadOnlyCollection<UrlInfo> output;


        await _logger.LogAsync($"Finding file info for URL '{url}'.");
        output = await InternalGetUrlInfoAsync(url, true);

        if (output.Count == 0) {
            await _logger.LogAsync("No strict matches found. Trying again with loose matching.");
            output = await InternalGetUrlInfoAsync(url, false);
        }

        return output;
    }


    private async Task<IReadOnlyCollection<UrlInfo>> InternalGetUrlInfoAsync(string url, bool strict) {
        List<UrlInfo> output;


        output = new List<UrlInfo>();

        foreach (ILinkHandler handler in _handlers) {
            UrlInfo? info;


            info = await handler.GetUrlInfoAsync(url, strict);

            if (info is not null) {
                await _logger.LogAsync($"The handler '{handler.Name}' mapped the file to '{info}'.");
                output.Add(info);
            }
        }

        return output;
    }

}
