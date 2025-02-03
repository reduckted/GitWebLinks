#nullable enable

using Microsoft.VisualStudio;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace GitWebLinks;


public class RepositoryFinder : IRepositoryFinder {

    private static readonly HashSet<string> IgnoredDirectories = new(
        new[] { "node_modules", "bin", "obj" },
        StringComparer.OrdinalIgnoreCase
    );

    private readonly Git _git;
    private readonly ISettings _settings;
    private readonly ILogger _logger;


    public RepositoryFinder(Git git, ISettings settings, ILogger logger) {
        _git = git;
        _settings = settings;
        _logger = logger;
    }


    public async IAsyncEnumerable<Repository> FindRepositoriesAsync(string directory) {
        await foreach (string root in InternalFindRepositoriesAsync(directory)) {
            yield return await CreateRepositoryAsync(root);
        }
    }


    private async IAsyncEnumerable<string> InternalFindRepositoriesAsync(string directory) {
        string? root;


        await _logger.LogAsync($"Searching for Git repositories in directory '{directory}'...");

        // The most common case is the directory is the same as
        // the root of the repository, or it's within a repository,
        // so start by searching up from the directory.
        await _logger.LogAsync("Searching up from the directory root...");
        root = FindRepositoryRoot(directory);

        if (root is not null) {
            yield return root;

        } else {
            // The directory could also contain multiple repositories, which
            // means we need to search down into the sub-directories.
            await _logger.LogAsync("Searching within the directory...");

            await foreach (string repository in SearchForRepositoriesAsync(directory)) {
                yield return repository;
            }
        }
    }


    private async IAsyncEnumerable<string> SearchForRepositoriesAsync(string directory) {
        IEnumerable<string> children;
        List<string> descendInto;

        // Find all child directories, but filter out some special
        // cases that shouldn't ever contain Git repositories.
        children = new DirectoryInfo(directory)
            .EnumerateDirectories()
            .Where((entry) => !entry.Name.StartsWith(".", StringComparison.Ordinal) &&
                    !IgnoredDirectories.Contains(entry.Name)
            )
            .Select((entry) => entry.FullName);

        descendInto = new List<string>();

        // Yield any direct child that is a repository root. Any other directories
        // can be descended into, but we'll look at all direct children first.
        foreach (string child in children) {
            if (IsRepositoryRoot(child)) {
                yield return child;
            } else {
                descendInto.Add(child);
            }
        }

        foreach (string child in descendInto) {
            await foreach (string repository in SearchForRepositoriesAsync(child)) {
                yield return repository;
            }
        }
    }


    public async Task<Repository?> FindRepositoryAsync(string path) {
        try {
            string? root;

            await _logger.LogAsync($"Finding root directory of Git repository starting from '{path}'...");

            root = FindRepositoryRoot(path);

            await _logger.LogAsync($"Root directory is '{root}'.");

            if (root is not null) {
                return await CreateRepositoryAsync(root);
            }
        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            await _logger.LogAsync($"Error finding repository for path '{path}'. {ex.Message}");
        }

        return null;
    }


    private async Task<Repository> CreateRepositoryAsync(string root) {
        Remote? remote;

        await _logger.LogAsync($"Finding remote URL for '{root}'...");

        remote = await FindRemoteAsync(root);

        await _logger.LogAsync($"Remote URL is '{remote}'.");

        return new Repository(root, remote);
    }


    private static string? FindRepositoryRoot(string startingPath) {
        string current;


        current = startingPath;

        while (!string.IsNullOrEmpty(current)) {
            if (IsRepositoryRoot(current)) {
                return current;
            }

            current = Path.GetDirectoryName(current);
        }

        return null;
    }


    private static bool IsRepositoryRoot(string path) {
        string gitFileName;


        gitFileName = Path.Combine(path, ".git");

        // .git will usually be a directory,
        //  but for a worktree it will be a file.
        return Directory.Exists(gitFileName) || File.Exists(gitFileName);
    }


    private async Task<Remote?> FindRemoteAsync(string root) {
        IReadOnlyList<string> data;
        List<Remote> remotes;
        string preferredRemoteName;

        await _logger.LogAsync("Finding remote repositories...");

        data = await _git.ExecuteAsync(root, "remote", "-v");

        remotes = data
            .Where((x) => !string.IsNullOrEmpty(x))
            .Select((x) => ParseRemote(x))
            .GroupBy((x) => x.Name, (x) => x.Url)
            .Select((x) => new Remote(x.Key, x.ToHashSet()))
            .ToList();

        await _logger.LogAsync($"Remotes found: {remotes}");

        // Use the remote that's specified in the settings if
        // that remote exists; otherwise, just use the first remote.
        preferredRemoteName = await _settings.GetPreferredRemoteNameAsync();

        return remotes.FirstOrDefault((x) => x.Name == preferredRemoteName)
            ?? remotes.OrderBy((x) => x.Name).FirstOrDefault();
    }


    private static (string Name, string Url) ParseRemote(string line) {
        string[] parts;
        string name;
        string urlAndType;
        string url;

        parts = line.Split('\t');
        name = parts[0];
        urlAndType = parts[1];
        url = urlAndType.Split(' ')[0];

        return (name, url);
    }

}
