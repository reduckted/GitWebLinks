#nullable enable

using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("e7f77273-c52a-4254-ae70-1516acd8b07f")]
public class GitHubEnterpriseOptionsPage : ServerOptionsPageBase {

    public const string Name = "GitHub Enterprise";
    public const short ResourceID = 205;


    protected override FrameworkElement CreateView() {
        return new GitHubEnterpriseOptionsControl();
    }

}
