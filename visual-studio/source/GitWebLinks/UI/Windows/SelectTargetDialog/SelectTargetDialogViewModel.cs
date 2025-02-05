#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.PatternMatching;
using Microsoft.VisualStudio.Threading;
using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;

namespace GitWebLinks;

public class SelectTargetDialogViewModel : ObservableObject {

    private readonly ILinkTargetLoader _loader;
    private readonly IPatternMatcherFactory _patternMatcherFactory;
    private readonly IEnumerable<LinkTargetListItem> _presets;
    private List<LinkTargetListItem> _allTargets;
    private List<LinkTargetListItem> _filteredTargets;
    private LinkTargetListItem? _selectedTarget;
    private bool _isLoading;
    private string _filterText;
    private bool? _dialogResult;


    public static async Task<SelectTargetDialogViewModel> CreateAsync(
        ILinkTargetLoader loader,
        IPatternMatcherFactory patternMatcherFactory,
        JoinableTaskFactory joinableTaskFactory
    ) {
        return new SelectTargetDialogViewModel(await loader.LoadPresetsAsync(), loader, patternMatcherFactory, joinableTaskFactory);
    }


    private SelectTargetDialogViewModel(
        IEnumerable<LinkTargetListItem> presets,
        ILinkTargetLoader loader,
        IPatternMatcherFactory patternMatcherFactory,
        JoinableTaskFactory joinableTaskFactory
    ) {
        _presets = presets;
        _loader = loader;
        _patternMatcherFactory = patternMatcherFactory;
        _isLoading = true;
        _filterText = "";

        _allTargets = _presets.ToList();
        _filteredTargets = _allTargets.ToList();
        _selectedTarget = _filteredTargets.FirstOrDefault();

        SelectTargetCommand = new DelegateCommand<LinkTargetListItem>(SelectTarget, null, joinableTaskFactory);
    }


    public async Task OnLoadedAsync() {
        try {
            await Task.WhenAll(
                PopulatePresetDescriptionsAsync(),
                LoadBranchesAndCommitsAsync()
            );

            ApplyFilter();

        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            await VS.MessageBox.ShowErrorAsync(
                Resources.Strings.SelectTargetDialog_CouldNotLoadTargets.Format(ex.Message)
            );
        }

        IsLoading = false;
    }


    private async Task PopulatePresetDescriptionsAsync() {
        await _loader.PopulatePresetDescriptionsAsync(_presets);
        ApplyFilter();
    }


    private async Task LoadBranchesAndCommitsAsync() {
        _allTargets = _presets.Concat(await _loader.LoadBranchesAndCommitsAsync()).ToList();
        ApplyFilter();
    }


    public DelegateCommand<LinkTargetListItem> SelectTargetCommand { get; }


    public bool IsLoading {
        get => _isLoading;
        private set {
            if (SetProperty(ref _isLoading, value)) {
                NotifyPropertyChanged(nameof(LoadingVisibility));
            }
        }
    }


    public Visibility LoadingVisibility => IsLoading ? Visibility.Visible : Visibility.Collapsed;


    public IReadOnlyList<LinkTargetListItem> Targets {
        get => _filteredTargets;
        private set {
            if (SetProperty(ref _filteredTargets, value.ToList())) {
                NotifyPropertyChanged(nameof(NoTargetsVisibility));
            }
        }
    }


    public Visibility NoTargetsVisibility => Targets.Count == 0 ? Visibility.Visible : Visibility.Collapsed;


    public LinkTargetListItem? SelectedTarget {
        get => _selectedTarget;
        set => SetProperty(ref _selectedTarget, value);
    }


    public string FilterText {
        get => _filterText;
        set {
            if (SetProperty(ref _filterText, value)) {
                ApplyFilter();
            }
        }
    }


    public bool? DialogResult {
        get => _dialogResult;
        private set => SetProperty(ref _dialogResult, value);
    }


    private void SelectTarget(LinkTargetListItem? target) {
        if (target is not null) {
            SelectedTarget = target;
            DialogResult = true;
        }
    }


    private void ApplyFilter() {
        string text;


        text = _filterText.Trim();

        if (!string.IsNullOrEmpty(text)) {
            IPatternMatcher matcher;


            matcher = _patternMatcherFactory.CreatePatternMatcher(
                text,
                new PatternMatcherCreationOptions(
                    CultureInfo.CurrentCulture,
                    PatternMatcherCreationFlags.AllowSimpleSubstringMatching | PatternMatcherCreationFlags.IncludeMatchedSpans
                )
            );

            Targets = _allTargets.Where((x) => MatchItem(matcher, x)).ToList();

        } else {
            foreach (LinkTargetListItem item in _allTargets) {
                item.ResetHighlightSpans();
            }

            Targets = _allTargets;
        }
    }


    private bool MatchItem(IPatternMatcher matcher, LinkTargetListItem item) {
        ImmutableArray<Span> nameMatches;
        ImmutableArray<Span> descriptionMatches;


        nameMatches = matcher.TryMatch(item.Name)?.MatchedSpans ?? ImmutableArray<Span>.Empty;
        descriptionMatches = matcher.TryMatch(item.Description)?.MatchedSpans ?? ImmutableArray<Span>.Empty;

        if (!nameMatches.IsEmpty || !descriptionMatches.IsEmpty) {
            item.NameHighlightSpans = nameMatches;
            item.DescriptionHighlightSpans = descriptionMatches;
            return true;

        } else {
            item.ResetHighlightSpans();
            return false;
        }
    }

}
