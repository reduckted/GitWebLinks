#nullable enable

using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("ff969319-149c-42f6-9c5b-79ad2f726c2f")]
public class GitLabEnterpriseOptionsPage : ServerOptionsPageBase {

    public const string Name = "GitLab Enterprise";
    public const short ResourceID = 206;


    protected override FrameworkElement CreateView() {
        return new GitLabEnterpriseOptionsControl();
    }

}
