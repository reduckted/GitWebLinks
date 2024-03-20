#nullable enable

using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("06f27a08-4137-4a6a-9e80-a6d3b6432e76")]
public class GiteaOptionsPage : ServerOptionsPageBase {

    public const string Name = "Gitea";
    public const short ResourceID = 208;


    protected override FrameworkElement CreateView() => new GiteaOptionsControl();

}
