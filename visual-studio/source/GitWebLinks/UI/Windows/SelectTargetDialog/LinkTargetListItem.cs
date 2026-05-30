#nullable enable

using Microsoft.VisualStudio.Imaging.Interop;
using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Text;
using System.Collections.Immutable;

namespace GitWebLinks;

public class LinkTargetListItem : ObservableObject {

    private ImmutableArray<Span> _nameHighlightSpans;
    private ImmutableArray<Span> _descriptionHighlightSpans;


    public LinkTargetListItem(
        LinkTargetListItemKind kind,
        string name,
        string description,
        ImageMoniker icon,
        ILinkTarget target
    ) {
        Kind = kind;
        Name = name;
        Description = description;
        Icon = icon;
        Target = target;
        _nameHighlightSpans = ImmutableArray<Span>.Empty;
        _descriptionHighlightSpans = ImmutableArray<Span>.Empty;
    }


    public LinkTargetListItemKind Kind { get; }


    public string Name { get; }


    public ILinkTarget Target { get; }


    public string Description { get; }


    public ImageMoniker Icon { get; }


    public ImmutableArray<Span> NameHighlightSpans {
        get => _nameHighlightSpans;
        set => SetProperty(ref _nameHighlightSpans, value);
    }


    public ImmutableArray<Span> DescriptionHighlightSpans {
        get => _descriptionHighlightSpans;
        set => SetProperty(ref _descriptionHighlightSpans, value);
    }


    public void ResetHighlightSpans() {
        NameHighlightSpans = ImmutableArray<Span>.Empty;
        DescriptionHighlightSpans = ImmutableArray<Span>.Empty;
    }

}
