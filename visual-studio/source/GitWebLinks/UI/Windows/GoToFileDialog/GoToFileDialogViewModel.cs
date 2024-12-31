#nullable enable

using Microsoft.VisualStudio;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Threading;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace GitWebLinks;

public class GoToFileDialogViewModel : ObservableObject, IDisposable {

    private readonly ILinkHandlerProvider _linkHandlerProvider;
    private readonly IRepositoryFinder _repositoryFinder;
    private readonly IVsSolution _solution;
    private readonly IVsImageService2 _imageService;
    private readonly JoinableTaskFactory _joinableTaskFactory;
    private readonly ILogger _logger;
    private CancellationTokenSource? _currentFindCancellation;
    private List<FileTargetListItem> _targets;
    private string _url;
    private FileTargetListItem? _selectedTarget;
    private bool? _dialogResult;


    public GoToFileDialogViewModel(
        ILinkHandlerProvider linkHandlerProvider,
        IRepositoryFinder repositoryFinder,
        IClipboard clipboard,
        IVsSolution solution,
        IVsImageService2 imageService,
        JoinableTaskFactory joinableTaskFactory,
        ILogger logger
    ) {
        _linkHandlerProvider = linkHandlerProvider;
        _repositoryFinder = repositoryFinder;
        _solution = solution;
        _imageService = imageService;
        _joinableTaskFactory = joinableTaskFactory;
        _logger = logger;

        _url = TryGetUrlFromClipboard(clipboard);
        _targets = [];
        _selectedTarget = null;

        SelectTargetCommand = new DelegateCommand<FileTargetListItem>(SelectTarget, null, joinableTaskFactory);

        if (!string.IsNullOrEmpty(_url)) {
            FindTargets();
        }
    }


    private string TryGetUrlFromClipboard(IClipboard clipboard) {
        string? contents;


        contents = clipboard.GetText();

        if (contents is not null) {
            contents = contents.Trim();

            if (contents.Length > 0) {
                if (Uri.TryCreate(contents, UriKind.Absolute, out Uri uri)) {
                    if (uri.Scheme is "http" or "https") {
                        return contents;
                    }
                }
            }
        }

        return "";
    }


    public DelegateCommand<FileTargetListItem> SelectTargetCommand { get; }


    public IReadOnlyList<FileTargetListItem> Targets {
        get => _targets;
        private set {
            if (SetProperty(ref _targets, value.ToList())) {
                NotifyPropertyChanged(nameof(NoTargetsVisibility));
            }
        }
    }


    public Visibility NoTargetsVisibility => Targets.Count == 0 ? Visibility.Visible : Visibility.Collapsed;


    public FileTargetListItem? SelectedTarget {
        get => _selectedTarget;
        set => SetProperty(ref _selectedTarget, value);
    }


    public string Url {
        get => _url;
        set {
            if (SetProperty(ref _url, value)) {
                FindTargets();
            }
        }
    }


    public bool? DialogResult {
        get => _dialogResult;
        private set => SetProperty(ref _dialogResult, value);
    }


    private void SelectTarget(FileTargetListItem? target) {
        if (target is not null) {
            SelectedTarget = target;
            DialogResult = true;
        }
    }


    private void FindTargets() {
        _currentFindCancellation?.Cancel();
        _currentFindCancellation = new CancellationTokenSource();

        FindTargetsAsync(_url.Trim(), _currentFindCancellation.Token).FireAndForget();
    }


    private async Task FindTargetsAsync(string url, CancellationToken cancellationToken) {
        try {
            List<FileTargetListItem> targets;


            targets = [];

            if (!string.IsNullOrEmpty(url)) {
                await _joinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);

                if (ErrorHandler.Succeeded(_solution.GetSolutionInfo(out string solutionDirectory, out _, out _))) {
                    IReadOnlyCollection<UrlInfo> info;
                    IReadOnlyCollection<MatchedUrlInfo> matches;


                    info = await _linkHandlerProvider.GetUrlInfoAsync(url);

                    if (cancellationToken.IsCancellationRequested) {
                        return;
                    }

                    if (info.Count > 0) {
                        matches = info.Select((x) => new MatchedUrlInfo(x)).ToList();

                        await FindFilesInRepositoriesAsync(solutionDirectory, matches, cancellationToken);

                        // Now use the matching repositories to build the full paths to the files.
                        // Note that we don't care about exact matches at this point. The exact
                        // matches are just a way to early-exit from finding the repositories.
                        foreach (MatchedUrlInfo match in matches) {
                            foreach (Repository repository in match.Repositories) {
                                string fileName;

                                fileName = Path.Combine(repository.Root, match.Info.FilePath);

                                // If the file exists (which also means it's a file
                                // and not a directory, because we can't go to a
                                // directory), then we can include this match.
                                if (File.Exists(fileName)) {
                                    // Normalize the file name so that the relative
                                    // path and icon can be calculated correctly.
                                    fileName = Path.GetFullPath(fileName);

                                    targets.Add(
                                        new FileTargetListItem(
                                            new FileTarget(fileName, match.Info.Selection),
                                            GetRelativePath(solutionDirectory, fileName),
                                            _imageService.GetImageMonikerForFile(fileName)
                                        )
                                    );
                                }
                            }
                        }
                    } else {
                        await _logger.LogAsync("No handlers found to handle the URL.");
                    }
                }
            }

            // Only set the targets if this operation has not been cancelled.
            // It will be cancelled when the URL is changed and a new search
            // is started. If a new search has started, we let it set the
            // new targets instead.
            if (!cancellationToken.IsCancellationRequested) {
                Targets = targets;
                SelectedTarget = targets.FirstOrDefault();
            }

        } catch (OperationCanceledException) { }
    }


    private async Task FindFilesInRepositoriesAsync(
        string solutionDirectory,
        IEnumerable<MatchedUrlInfo> matches,
        CancellationToken cancellationToken
    ) {
        await foreach (Repository repository in _repositoryFinder.FindRepositoriesAsync(solutionDirectory)) {
            if (cancellationToken.IsCancellationRequested) {
                return;
            }

            if (repository.Remote is null) {
                continue;
            }

            // Look at each URL that we haven't found an exact match for.
            foreach (MatchedUrlInfo item in matches.Where((x) => !x.ExactMatch)) {
                if (await IsMatchingRepositoryAsync(repository, item.Info.Server)) {
                    // The URL is an exact match for this repository, so mark it as an
                    // exact match and replace any possible repository matches that were
                    // found previously with this repository that is an exact match.
                    item.ExactMatch = true;
                    item.Repositories.Clear();
                    item.Repositories.Add(repository);

                } else {
                    // The URL is not an exact match for this repository, but that could
                    // be because the remote URLs that we determined aren't quite correct,
                    // or perhaps the URL comes from a fork of the repository.
                    //
                    // We'll use the existence of the URI in the repository to determine
                    // whether this repository *could* be a match. If the URI does not exist
                    // in the repository, this this repository is not a match for the URI.
                    //
                    // Note that the inverse is not true - if the URI exists, there is no
                    // guarantee that this is the correct repository, because a file could
                    // be found in many repositories. For example, if the file is "readme.md",
                    // then it's probably in all repositories.
                    if (File.Exists(Path.Combine(repository.Root, item.Info.FilePath))) {
                        // The URI is in this repository, so record
                        // this repository as a possible match.
                        item.Repositories.Add(repository);
                    }
                }
            }

            // If all URLs now have an exact match, then we
            // can stop looking through the repositories.
            if (matches.All((x) => x.ExactMatch)) {
                break;
            }
        }
    }


    private async Task<bool> IsMatchingRepositoryAsync(Repository repository, StaticServer server) {
        if (repository.Remote is not null) {
            foreach (string url in repository.Remote.Urls) {
                if (await new RemoteServer(server).MatchRemoteUrlAsync(url) is not null) {
                    return true;
                }
            }
        }

        return false;
    }


    private string GetRelativePath(string solutionDirectory, string fileName) {
        unsafe {
            char* buffer = stackalloc char[260];


            if (NativeMethods.PathRelativePathTo(
                buffer,
                solutionDirectory,
                NativeMethods.FILE_ATTRIBUTE_DIRECTORY,
                fileName,
                NativeMethods.FILE_ATTRIBUTE_NORMAL
            ) != 0) {
                string relative;

                relative = new string(buffer);

                // Trim off the leading ".\" if there is one.
                if (relative.StartsWith(".\\")) {
                    relative = relative.Substring(2);
                }

                return relative;

            } else {
                // The paths do not share a common ancestor,
                // so we will use the full destination path.
                return fileName;
            }
        }
    }


    public void Dispose() {
        _currentFindCancellation?.Cancel();
        GC.SuppressFinalize(this);
    }


    private class MatchedUrlInfo {

        public MatchedUrlInfo(UrlInfo info) {
            Info = info;
            Repositories = [];
        }


        public UrlInfo Info { get; }


        public bool ExactMatch { get; set; }


        public List<Repository> Repositories { get; }

    }

}
