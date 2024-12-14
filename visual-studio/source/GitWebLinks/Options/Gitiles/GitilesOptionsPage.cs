#nullable enable

using System;
using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("101e4ad3-b8b0-4864-851a-b455be2068c4")]
public class GitilesOptionsPage : ServerOptionsPageBase {

    public const string Name = "Gitiles";
    public const short ResourceID = 207;


    protected override FrameworkElement CreateView() {
        return new GitilesOptionsControl();
    }

}
