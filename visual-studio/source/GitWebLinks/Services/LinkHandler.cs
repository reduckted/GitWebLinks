#nullable enable

using Fluid;
using Microsoft.VisualStudio;
using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;

namespace GitWebLinks;

public class LinkHandler : ILinkHandler {

    private readonly HandlerDefinition _definition;
    private readonly ISettings _settings;
    private readonly Git _git;
    private readonly RemoteServer _server;


    public LinkHandler(HandlerDefinition definition, ISettings settings, Git git) {
        _definition = definition;
        _settings = settings;
        _git = git;

        if (definition is PrivateHandlerDefinition privateHandlerDefinition) {
            _server = new RemoteServer(async () => await _settings.GetServersAsync(privateHandlerDefinition.ServerSettingsKey));
        } else {
            _server = new RemoteServer(((PublicHandlerDefinition)definition).Servers);
        }
    }


    public string Name => _definition.Name;


    public async Task<bool> HandlesRemoteUrlAsync(string remoteUrl) {
        return await _server.MatchRemoteUrlAsync(UrlHelpers.Normalize(remoteUrl)) is not null;
    }


    public async Task<CreateUrlResult> CreateUrlAsync(Repository repository, FileInfo file, LinkOptions options) {
        if (repository.Remote is null) {
            throw new InvalidOperationException("The repository must have a remote.");
        }

        string remoteUrl;
        StaticServer address;
        string refValue;
        RefType refType;
        LinkType linkType;
        string url;
        string relativePath;
        string selection;
        TemplateData data;
        TemplateContext context;


        // If a link type wasn't specified, then we'll use
        // the default type that's defined in the settings.
        if (options.Target is LinkTargetPreset preset) {
            linkType = preset.Type ?? await _settings.GetDefaultLinkTypeAsync();
            refType = linkType == LinkType.Commit ? RefType.Commit : RefType.Branch;
            refValue = await GetRefAsync(linkType, repository.Root, repository.Remote);

        } else if (options.Target is LinkTargetRef refTarget) {
            if (refTarget.Type == RefType.Branch) {
                refType = RefType.Branch;
                refValue = _definition.BranchRef == BranchRefType.Abbreviated
                    ? refTarget.RefInfo.Abbreviated
                    : refTarget.RefInfo.Symbolic;
            } else {
                refType = RefType.Commit;
                refValue = await _settings.GetUseShortHashesAsync()
                    ? refTarget.RefInfo.Abbreviated
                    : refTarget.RefInfo.Symbolic;
            }

        } else {
            throw new NotSupportedException($"Unknown link target {options.Target.GetType().Name}.");
        }

        // Adjust the remote URL so that it's in a
        // standard format that we can manipulate.
        remoteUrl = UrlHelpers.Normalize(repository.Remote.Url);

        address = await GetAddressAsync(remoteUrl);
        relativePath = GetRelativePath(repository.Root, file.FilePath);

        data = TemplateData
            .Create()
            .Add("base", address.Web ?? address.Http)
            .Add("repository", GetRepositoryPath(remoteUrl, address))
            .Add("ref", refValue)
            .Add("commit", await GetRefAsync(LinkType.Commit, repository.Root, repository.Remote))
            .Add("file", relativePath)
            .Add("type", refType == RefType.Commit ? "commit" : "branch");

        if (file.Selection is not null) {
            data.Add("startLine", file.Selection.StartLine);
            data.Add("startColumn", file.Selection.StartColumn);
            data.Add("endLine", file.Selection.EndLine);
            data.Add("endColumn", file.Selection.EndColumn);
        }

        foreach (string key in _definition.SettingsKeys) {
            data.Add(key, await _settings.GetHandlerSettingAsync(key));
        }

        context = data.AsTemplateContext();
        url = _definition.Url.Render(context);

        if (file.Selection is not null) {
            selection = _definition.Selection.Render(context);
            url += selection;
        } else {
            selection = "";
        }

        url = ApplyModifications(
            url,
            _definition.Query.Where((x) => x.Pattern.IsMatch(file.FilePath)).ToList()
        );

        return new CreateUrlResult(url, relativePath, selection);
    }


    private static string ApplyModifications(string url, IReadOnlyList<QueryModification> modifications) {
        if (modifications.Count > 0) {
            UriBuilder builder;
            NameValueCollection query;


            builder = new UriBuilder(url);
            query = HttpUtility.ParseQueryString(builder.Query);

            foreach (var modification in modifications) {
                query.Add(modification.Key, modification.Value);
            }

            builder.Query = query.ToString();
            url = builder.Uri.AbsoluteUri;
        }

        return url;
    }


    private async Task<StaticServer> GetAddressAsync(string remoteUrl) {
        StaticServer? address;


        address = await _server.MatchRemoteUrlAsync(remoteUrl);

        if (address is null) {
            throw new InvalidOperationException("Could not find a matching address.");
        }

        return NormalizeServerUrls(address);
    }


    private static StaticServer NormalizeServerUrls(StaticServer address) {
        string http;
        string? ssh;
        string? web;

        http = UrlHelpers.Normalize(address.Http);
        ssh = address.Ssh is not null ? UrlHelpers.Normalize(address.Ssh) : null;
        web = address.Web is not null ? UrlHelpers.Normalize(address.Web) : null;

        return new StaticServer(http, ssh, web);
    }


    private static string GetRepositoryPath(string remoteUrl, StaticServer address) {
        string repositoryPath;


        // Remove the server's address from the start of the URL.
        // Note that the remote URL and both URLs in the server
        // address have been normalized by this point.
        if (remoteUrl.StartsWith(address.Http, StringComparison.Ordinal)) {
            repositoryPath = remoteUrl.Substring(address.Http.Length);
        } else {
            repositoryPath = address.Ssh is not null ? remoteUrl.Substring(address.Ssh.Length) : "";
        }

        // The server address we matched against may not have ended
        // with a slash (for HTTPS paths) or a colon (for SSH paths),
        // which means the path might start with that. Trim that off now.
        if (repositoryPath.Length > 0) {
            if (repositoryPath[0] == '/' || repositoryPath[0] == ':') {
                repositoryPath = repositoryPath.Substring(1);
            }
        }

        if (repositoryPath.EndsWith(".git", StringComparison.Ordinal)) {
            repositoryPath = repositoryPath.Substring(0, repositoryPath.Length - 4);
        }

        return repositoryPath;
    }


    public async Task<string> GetRefAsync(LinkType type, string repositoryRoot, Remote remote) {
        switch (type) {
            case LinkType.CurrentBranch:
                return string
                    .Concat(await _git.ExecuteAsync(repositoryRoot, "rev-parse", GetRevParseOutputArgument(), "HEAD"))
                    .Trim();

            case LinkType.Commit:
                if (await _settings.GetUseShortHashesAsync()) {
                    return string.Concat(await _git.ExecuteAsync(repositoryRoot, "rev-parse", "--short", "HEAD")).Trim();
                } else {
                    return string.Concat(await _git.ExecuteAsync(repositoryRoot, "rev-parse", "HEAD")).Trim();
                }

            default:
                string defaultBranch;

                // Use the default branch if one is specified in the settings; otherwise find the
                // name of the default branch by getting the name of the "remote_name/HEAD" ref.
                defaultBranch = await _settings.GetDefaultBranchAsync();

                if (string.IsNullOrEmpty(defaultBranch)) {
                    defaultBranch = await GetDefaultRemoteBranchAsync(repositoryRoot, remote);
                }

                return defaultBranch!;
        }
    }


    private async Task<string> GetDefaultRemoteBranchAsync(string repositoryRoot, Remote remote) {
        string branch;

        try {
            branch = string.Concat(
                await _git.ExecuteAsync(
                    repositoryRoot,
                    "rev-parse",
                    GetRevParseOutputArgument(),
                    $"{remote.Name}/HEAD"
                )
            ).Trim();

        } catch (GitException ex) {
            throw new NoRemoteHeadException(ex.Message);
        }

        switch (_definition.BranchRef) {
            case BranchRefType.Abbreviated:
                // The branch name will be "remote_name/branch_name",
                // but we only want the "branch_name" part.
                return branch.Substring(remote.Name.Length + 1);

            case BranchRefType.Symbolic:
                // The branch name will be "refs/remotes/remote_name/branch_name",
                // but we want it to be "refs/heads/branch_name".
                return Regex.Replace(
                    branch,
                    $"^refs/remotes/{EscapeRegex(remote.Name)}/",
                    "refs/heads/"
                );

            default:
                return branch;

        }
    }


    private static string EscapeRegex(string value) {
        return Regex.Replace(value, "[-/\\^$*+?.()|[\\]{}]", "\\$&");
    }


    private string GetRevParseOutputArgument() {
        switch (_definition.BranchRef) {
            case BranchRefType.Symbolic:
                return "--symbolic-full-name";

            default:
                return "--abbrev-ref";
        }
    }


    private string GetRelativePath(string from, string to) {
        string relativePath;
        int toType;


        // If the file is a symbolic link, or is under a directory that's a
        // symbolic link, then we want to resolve the path to the real file
        // because the symbolic link won't be in the Git repository.
        if (IsSymbolicLink(to, from)) {
            try {
                to = GetRealPath(to);

                // Getting the real path of the file resolves all symbolic links,
                // which means if the repository is also under a symbolic link,
                // then the new file path may no longer be under the root directory.
                // We can fix this by also getting the real path of the root directory.
                from = GetRealPath(from);

            } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
                // Provide a nicer error message that
                // explains what we were trying to do.
                throw new InvalidOperationException(
                    $"Unable to resolve the symbolic link '{to}' to a real path.\n{ex.Message}"
                );
            }
        }

        // The "from" path is always a directory because it's the root of the
        // repository, but the "to" path could be a directory or a file.
        if (new DirectoryInfo(to).Exists) {
            toType = NativeMethods.FILE_ATTRIBUTE_DIRECTORY;
        } else {
            toType = NativeMethods.FILE_ATTRIBUTE_NORMAL;
        }

        unsafe {
            char* buffer = stackalloc char[260];


            if (NativeMethods.PathRelativePathTo(buffer, from, NativeMethods.FILE_ATTRIBUTE_DIRECTORY, to, toType) != 0) {
                relativePath = new string(buffer);

            } else {
                // The paths do not share a common ancestor,
                // so we will use the full destination path.
                relativePath = to;
            }
        }

        // Normalize the separators to forward slashes.
        relativePath = relativePath.Replace('\\', '/');

        // Strip the leading "./" if there is one.
        if (relativePath.StartsWith("./", StringComparison.Ordinal)) {
            relativePath = relativePath.Substring(2);
        }

        return relativePath;
    }


    private static bool IsSymbolicLink(string filePath, string rootDirectory) {
        // Check if the file is a symbolic link. If it isn't, then walk up
        // the tree to see if an ancestor directory is a symbolic link. Keep
        // stepping up until we reach the root directory of the repository,
        // because we only need to resolve symbolic links within the repository.
        // If the entire repository is under a symbolic link, then we don't
        // want to resolve paths to somewhere outside the repository.
        while (!string.Equals(filePath, rootDirectory, StringComparison.OrdinalIgnoreCase)) {
            FileSystemInfo info;


            info = new System.IO.FileInfo(filePath);

            if (!info.Exists) {
                info = new DirectoryInfo(filePath);
            }

            if (!info.Exists) {
                return false;
            }

            if ((info.Attributes & FileAttributes.ReparsePoint) != 0) {
                return true;
            }

            filePath = Path.GetDirectoryName(filePath);

            if (filePath is null) {
                // We can't go any higher, so the
                // path cannot be a symbolic link.
                return false;
            }
        }

        return false;
    }


    private static string GetRealPath(string filePath) {
        IntPtr handle;


        handle = NativeMethods.CreateFile(
            filePath,
            NativeMethods.FILE_READ_EA,
            FileShare.ReadWrite | FileShare.Delete,
            IntPtr.Zero,
            FileMode.Open,
            NativeMethods.FILE_FLAG_BACKUP_SEMANTICS,
            IntPtr.Zero
        );

        if (handle == NativeMethods.INVALID_HANDLE_VALUE) {
            throw new Win32Exception();
        }

        try {
            int bufferSize = 260;


            while (true) {
                if (TryGetFinalPathNameByHandle(handle, bufferSize, out string finalPath)) {
                    return finalPath;
                }

                bufferSize *= 2;
            }

        } finally {
            NativeMethods.CloseHandle(handle);
        }
    }


    private static bool TryGetFinalPathNameByHandle(IntPtr handle, int bufferSize, out string finalPath) {
        unsafe {
            char* buffer = stackalloc char[bufferSize];
            uint length;


            length = NativeMethods.GetFinalPathNameByHandle(handle, buffer, (uint)bufferSize, 0);

            if (length == 0) {
                throw new Win32Exception();
            }

            if (length <= bufferSize) {
                finalPath = new string(buffer);
                return true;
            }
        }

        finalPath = default!;
        return false;
    }


    public async Task<UrlInfo?> GetUrlInfoAsync(string webUrl, bool strict) {
        StaticServer? address;
        Match match;


        // See if the URL matches the server address for the handler.
        address = await _server.MatchWebUrlAsync(webUrl);

        // If we are performing a strict match, then the
        // URL must match to this handler's server.
        if (strict && (address is null)) {
            return null;
        }

        if (address is not null) {
            address = NormalizeServerUrls(address);
        }

        match = _definition.Reverse.Pattern.Match(webUrl);

        if (match.Success) {
            TemplateContext context;
            string file;
            StaticServer server;
            PartialSelectedRange? selection;


            context = TemplateData
                .Create()
                .Add("http", address?.Http)
                .Add("ssh", address?.Ssh)
                .Add("web", address?.Web)
                .Add(match)
                .AsTemplateContext();

            file = _definition.Reverse.File.Render(context);

            server = new StaticServer(
                _definition.Reverse.Server.Http.Render(context),
                _definition.Reverse.Server.Ssh.Render(context),
                _definition.Reverse.Server.Web?.Render(context)
            );

            selection = new PartialSelectedRange(
                TryParseNumber(_definition.Reverse.Selection.StartLine.Render(context)),
                TryParseNumber(_definition.Reverse.Selection.StartColumn?.Render(context)),
                TryParseNumber(_definition.Reverse.Selection.EndLine?.Render(context)),
                TryParseNumber(_definition.Reverse.Selection.EndColumn?.Render(context))
            );

            return new UrlInfo(file, server, selection);
        }

        return null;
    }


    private static int? TryParseNumber(string? value) {
        if (value is not null) {
            if (int.TryParse(value, out int result)) {
                return result;
            }
        }

        return null;
    }

}

