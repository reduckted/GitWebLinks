#nullable enable

using Microsoft.VisualStudio;
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


    public async Task<IReadOnlyList<LinkTargetListItem>> LoadPresetsAsync() {
        LinkType defaultType;
        IEnumerable<LinkTargetListItem> presets;


        defaultType = await _settings.GetDefaultLinkTypeAsync();

        presets = new[]{
            new LinkTargetListItem(LinkTargetListItemKind.Preset,"Current branch", new LinkTargetPreset(LinkType.CurrentBranch)),
            new LinkTargetListItem(LinkTargetListItemKind.Preset,"Current commit", new LinkTargetPreset(LinkType.Commit)),
            new LinkTargetListItem(LinkTargetListItemKind.Preset,"Default branch", new LinkTargetPreset(LinkType.DefaultBranch))
        };

        // Sort the default preset to the top of the list. This
        // is done when we create the view model so that they are
        // initially shown in the correct orderDo this first so that.
        return presets
            .OrderByDescending((x) => ((LinkTargetPreset)x.Target).Type == defaultType)
            .ThenBy((x) => x.Name)
            .ToList();
    }


    public async Task PopulatePresetDescriptionsAsync(IEnumerable<LinkTargetListItem> presets) {
        string[] descriptions;


        descriptions = await Task.WhenAll(
            TryGetRefAsync(LinkType.CurrentBranch),
            TryGetRefAsync(LinkType.Commit),
            TryGetRefAsync(LinkType.DefaultBranch)
        );

        foreach (var preset in presets) {
            switch (((LinkTargetPreset)preset.Target).Type) {
                case LinkType.CurrentBranch:
                    preset.Description = descriptions[0];
                    break;

                case LinkType.Commit:
                    preset.Description = descriptions[1];
                    break;

                case LinkType.DefaultBranch:
                    preset.Description = descriptions[2];
                    break;
            }
        }
    }


    private async Task<string> TryGetRefAsync(LinkType linkType) {
        try {
            return await _handler.GetRefAsync(linkType, _repositoryRoot, _remote);

        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            await _logger.LogAsync($"Error when getting ref for link type '{linkType}': {ex}");
            return "";
        }
    }


    public async Task<IReadOnlyList<LinkTargetListItem>> LoadBranchesAndCommitsAsync() {
        try {
            IReadOnlyList<string> lines;
            List<LinkTargetListItem> branches;
            List<LinkTargetListItem> commits;
            bool useShortHashes;


            lines = await _git.ExecuteAsync(
                _repositoryRoot,
                "branch",
                "--list",
                "--no-color",
                "--format",
                "\"%(refname:short) %(refname) %(objectname:short) %(objectname)\""
            );

            branches = new List<LinkTargetListItem>();
            commits = new List<LinkTargetListItem>();
            useShortHashes = await _settings.GetUseShortHashesAsync();

            foreach (string line in lines.Where((x) => x.Length > 0)) {
                string[] parts;


                parts = line.Split(' ');

                branches.Add(
                    new LinkTargetListItem(
                        LinkTargetListItemKind.Branch,
                        parts[0],
                        new LinkTargetRef(new RefInfo(parts[0], parts[1]), RefType.Branch)
                    ) { Description = useShortHashes ? parts[2] : parts[3] }
                );

                commits.Add(
                    new LinkTargetListItem(
                        LinkTargetListItemKind.Commit,
                        useShortHashes ? parts[2] : parts[3],
                        new LinkTargetRef(new RefInfo(parts[2], parts[3]), RefType.Commit)
                    ) { Description = parts[0] }
                );
            }

            branches.Sort((x, y) => string.Compare(x.Name, y.Name, true));
            commits.Sort((x, y) => string.Compare(x.Name, y.Name, true));

            return branches.Concat(commits).ToList();

        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            await _logger.LogAsync($"Error while finding branch and commit link targets: {ex}");
            return Array.Empty<LinkTargetListItem>();
        }
    }

}
