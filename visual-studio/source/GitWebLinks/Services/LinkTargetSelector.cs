#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Text.PatternMatching;
using System.Threading.Tasks;

namespace GitWebLinks;

public class LinkTargetSelector {

    private readonly ISettings _settings;
    private readonly Git _git;
    private readonly ILogger _logger;


    public LinkTargetSelector(ISettings settings, Git git, ILogger logger) {
        _settings = settings;
        _git = git;
        _logger = logger;
    }


    public async Task<ILinkTarget?> SelectAsync(ILinkHandler handler, Repository repository) {
        SelectTargetDialogViewModel viewModel;
        SelectTargetDialog dialog;


        viewModel = await SelectTargetDialogViewModel.CreateAsync(
            new LinkTargetLoader(_settings, _git, handler, repository, _logger),
            await VS.GetMefServiceAsync<IPatternMatcherFactory>(),
            ThreadHelper.JoinableTaskFactory
        );

        dialog = new SelectTargetDialog { DataContext = viewModel };

        if (dialog.ShowModal().GetValueOrDefault()) {
            return viewModel.SelectedTarget?.Target;
        }

        return null;
    }

}
