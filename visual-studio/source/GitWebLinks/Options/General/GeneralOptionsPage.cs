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
    private LinkType _defaultLinkType;
    private bool _showCopyLinkMenuItem;
    private bool _showOpenLinkMenuItem;


    public GeneralOptionsPage() {
        _defaultBranch = "";
        _defaultLinkType = LinkType.Commit;
        _showCopyLinkMenuItem = true;
        _showOpenLinkMenuItem = false;

        LinkTypes = new List<LinkTypeListItem> {
            new LinkTypeListItem(LinkType.Commit),
            new LinkTypeListItem(LinkType.CurrentBranch),
            new LinkTypeListItem(LinkType.DefaultBranch)
        };
    }


    [DefaultValue("")]
    public string DefaultBranch {
        get => _defaultBranch;
        set => SetProperty(ref _defaultBranch, value);
    }


    [DefaultValue(LinkType.Commit)]
    public LinkType DefaultLinkType {
        get => _defaultLinkType;
        set {
            SetProperty(ref _defaultLinkType, value);
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


    protected override FrameworkElement CreateView() => new GeneralOptionsControl();


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public IReadOnlyList<LinkTypeListItem> LinkTypes { get; }


    [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
    public LinkTypeListItem SelectedDefaultLinkType {
        get => LinkTypes.FirstOrDefault((x) => x.Value == DefaultLinkType) ?? LinkTypes[0];
        set => DefaultLinkType = value.Value;
    }

}
