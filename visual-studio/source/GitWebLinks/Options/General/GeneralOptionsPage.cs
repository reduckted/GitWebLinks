#nullable enable

using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("885262b2-445c-44d7-be97-ef3dda10e10c")]
public class GeneralOptionsPage : OptionsPageBase {

    public const string Name = "General";
    public const short ResourceID = 201;


    private string _defaultBranch;
    private string _preferredRemoteName;
    private LinkType _defaultLinkType;
    private LinkFormat _linkFormat;
    private bool _showCopyLinkMenuItem;
    private bool _showOpenLinkMenuItem;
    private bool _useShortHashes;


    public GeneralOptionsPage() {
        _defaultBranch = "";
        _preferredRemoteName = "origin";
        _defaultLinkType = LinkType.Commit;
        _showCopyLinkMenuItem = true;
        _showOpenLinkMenuItem = false;
        _useShortHashes = false;

        LinkTypes = new List<LinkTypeListItem> {
            new (LinkType.Commit),
            new (LinkType.CurrentBranch),
            new (LinkType.DefaultBranch)
        };

        LinkFormats = new List<LinkFormatListItem> {
            new (LinkFormat.Raw),
            new (LinkFormat.Markdown),
            new (LinkFormat.MarkdownWithPreview)
        };
    }


    [DefaultValue("")]
    public string DefaultBranch {
        get => _defaultBranch;
        set => SetProperty(ref _defaultBranch, value);
    }


    [DefaultValue("origin")]
    public string PreferredRemoteName {
        get => _preferredRemoteName;
        set => SetProperty(ref _preferredRemoteName, value);
    }


    [DefaultValue(LinkType.Commit)]
    public LinkType DefaultLinkType {
        get => _defaultLinkType;
        set {
            SetProperty(ref _defaultLinkType, value);
            OnPropertyChanged(nameof(SelectedDefaultLinkType));
        }
    }


    [DefaultValue(LinkFormat.Raw)]
    public LinkFormat LinkFormat {
        get => _linkFormat;
        set {
            SetProperty(ref _linkFormat, value);
            OnPropertyChanged(nameof(SelectedDefaultLinkType));
        }
    }



    [DefaultValue(true)]
    public bool ShowCopyLinkMenuItem {
        get => _showCopyLinkMenuItem;
        set => SetProperty(ref _showCopyLinkMenuItem, value);
    }


    [DefaultValue(false)]
    public bool ShowOpenLinkMenuItem {
        get => _showOpenLinkMenuItem;
        set => SetProperty(ref _showOpenLinkMenuItem, value);
    }


    [DefaultValue(false)]
    public bool UseShortHashes {
        get => _useShortHashes;
        set => SetProperty(ref _useShortHashes, value);
    }


    protected override FrameworkElement CreateView() {
        return new GeneralOptionsControl();
    }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public IReadOnlyList<LinkTypeListItem> LinkTypes { get; }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public IReadOnlyList<LinkFormatListItem> LinkFormats { get; }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public LinkTypeListItem SelectedDefaultLinkType {
        get => LinkTypes.FirstOrDefault((x) => x.Value == DefaultLinkType) ?? LinkTypes[0];
        set => DefaultLinkType = value.Value;
    }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public LinkFormatListItem SelectedLinkFormat {
        get => LinkFormats.FirstOrDefault((x) => x.Value == LinkFormat) ?? LinkFormats[0];
        set => LinkFormat = value.Value;
    }

}
