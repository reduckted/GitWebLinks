#nullable enable

using System.Threading.Tasks;

namespace GitWebLinks;

public interface ILinkHandler {

    string Name { get; }


    Task<string> CreateUrlAsync(Repository repository, FileInfo file, LinkOptions options);


    Task<string> GetRefAsync(LinkType type, string repositoryRoot, Remote remote);


    Task<UrlInfo?> GetUrlInfoAsync(string url, bool strict);


    Task<bool> IsMatchAsync(string remoteUrl);

}
