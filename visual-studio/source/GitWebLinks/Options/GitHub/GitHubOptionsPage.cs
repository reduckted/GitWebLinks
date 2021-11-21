#nullable enable

using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("e6e8e2a6-992a-47d4-afdd-337956031e23")]
public class GitHubOptionsPage : OptionsPageBase {

    public const string Name = "GitHub";
    public const short ResourceID = 202;


    private bool _useGitHubDev;


    [DefaultValue(false)]
    public bool UseGitHubDev {
        get => _useGitHubDev;
        set => SetProperty(ref _useGitHubDev, value);
    }


    protected override FrameworkElement CreateView() => new GitHubOptionsControl();

}
