#nullable enable

using Microsoft.VisualStudio.Imaging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GitWebLinks;

public class LinkTargetLoader : ILinkTargetLoader {

    private readonly ISettings _settings;
    private readonly Git _git;
    private readonly ILinkHandler _handler;
    private readonly string _repositoryRoot;
    private readonly Remote _remote;
    private readonly ILogger _logger;


    public LinkTargetLoader(
        ISettings settings,
        Git git,
        ILinkHandler handler,
        Repository repository,
        ILogger logger
    ) {
        if (repository.Remote is null) {
            throw new ArgumentException("Repository must have a remote.");
        }

        _settings = settings;
        _git = git;
        _handler = handler;
        _repositoryRoot = repository.Root;
        _remote = repository.Remote;
        _logger = logger;
    }


    public async Task<IReadOnlyList<LinkTargetListItem>> LoadAsync() {
        IReadOnlyList<LinkTargetListItem>[] items;


        items = await Task.WhenAll(
            LoadPresetsAsync(),
            LoadRefsAsync()
        );

        return items.SelectMany((x) => x).ToList();
    }


    private async Task<IReadOnlyList<LinkTargetListItem>> LoadPresetsAsync() {
        LinkType defaultType;
        string[] descriptions;
        List<LinkTargetListItem> presets;


        defaultType = await _settings.GetDefaultLinkTypeAsync();

        descriptions = await Task.WhenAll(
            TryGetRefAsync(LinkType.CurrentBranch),
            TryGetRefAsync(LinkType.Commit),
            TryGetRefAsync(LinkType.DefaultBranch)
        );

        presets = new List<LinkTargetListItem>();

        // Omit the current branch as a preset target
        // if the current commit is a detached HEAD.
        if (descriptions[0] != "HEAD") {
            presets.Add(
                new LinkTargetListItem(
                    LinkTargetListItemKind.Preset,
                    "Current branch",
                    descriptions[0],
                    KnownMonikers.Branch,
                    new LinkTargetPreset(LinkType.CurrentBranch)
                )
            );
        }

        presets.Add(
            new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "Current commit",
                descriptions[1],
                KnownMonikers.Commit,
                new LinkTargetPreset(LinkType.Commit)
            )
        );

        presets.Add(
            new LinkTargetListItem(
                LinkTargetListItemKind.Preset,
                "Default branch",
                descriptions[2],
                KnownMonikers.Branch,
                new LinkTargetPreset(LinkType.DefaultBranch)
            )
        );

        // Sort the default preset to the top of the list.
        return presets
            .OrderByDescending((x) => ((LinkTargetPreset)x.Target).Type == defaultType)
            .ThenBy((x) => x.Name)
            .ToList();
    }


    private async Task<string> TryGetRefAsync(LinkType linkType) {
        try {
            return await _handler.GetRefAsync(linkType, _repositoryRoot, _remote);

        } catch (Exception ex) when (ex is NoRemoteHeadException or GitCommandException) {
            await _logger.LogAsync($"Error when getting ref for link type '{linkType}': {ex}");
            return "";
        }
    }


    private async Task<IReadOnlyList<LinkTargetListItem>> LoadRefsAsync() {
        try {
            IReadOnlyList<string>[] lines;
            List<LinkTargetListItem> branches;
            List<LinkTargetListItem> commits;
            List<LinkTargetListItem> tags;
            bool useShortHashes;


            lines = await Task.WhenAll(
                _git.ExecuteAsync(
                    _repositoryRoot,
                    "branch",
                    "--list",
                    "--no-color",
                    "--format",
                    "\"%(refname:short)~%(refname)~%(objectname:short)~%(objectname)\""
                ),
                _handler.SupportsTags ?
                    _git.ExecuteAsync(_repositoryRoot, "tag", "--points-at", "HEAD") :
                    Task.FromResult<IReadOnlyList<string>>(Array.Empty<string>())
            );

            branches = new List<LinkTargetListItem>();
            commits = new List<LinkTargetListItem>();
            tags = new List<LinkTargetListItem>();
            useShortHashes = await _settings.GetUseShortHashesAsync();

            foreach (string line in lines[0].Where((x) => x.Length > 0)) {
                string[] parts;


                parts = line.Split('~');

                // Omit the branch item for a detached HEAD, but include the commit.
                if (!parts[0].StartsWith("(HEAD detached", StringComparison.Ordinal)) {
                    branches.Add(
                        new LinkTargetListItem(
                            LinkTargetListItemKind.Branch,
                            parts[0],
                            useShortHashes ? parts[2] : parts[3],
                            KnownMonikers.Branch,
                            new LinkTargetRef(new RefInfo(parts[0], parts[1]), RefType.Branch)
                        )
                    );
                }

                commits.Add(
                    new LinkTargetListItem(
                        LinkTargetListItemKind.Commit,
                        useShortHashes ? parts[2] : parts[3],
                        parts[0],
                        KnownMonikers.Commit,
                        new LinkTargetRef(new RefInfo(parts[2], parts[3]), RefType.Commit)
                    )
                );
            }

            foreach (string line in lines[1].Where((x) => x.Length > 0)) {
                tags.Add(
                    new LinkTargetListItem(
                        LinkTargetListItemKind.Tag,
                        line,
                        "",
                        KnownMonikers.SmartTag,
                        new LinkTargetRef(new RefInfo(line, line), RefType.Tag)
                    )
                );
            }

            branches.Sort((x, y) => string.Compare(x.Name, y.Name, true));
            commits.Sort((x, y) => string.Compare(x.Name, y.Name, true));
            tags.Sort((x, y) => string.Compare(x.Name, y.Name, true));

            return branches.Concat(commits).Concat(tags).ToList();

        } catch (GitCommandException ex) {
            await _logger.LogAsync($"Error while finding branch and commit link targets: {ex}");
            return Array.Empty<LinkTargetListItem>();
        }
    }

}
