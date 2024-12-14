#nullable enable

using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("cdf4f2d7-70bf-478e-8991-61606ee44b05")]
public class BitbucketServerOptionsPage : ServerOptionsPageBase {

    public const string Name = "Bitbucket Server";
    public const short ResourceID = 204;


    protected override FrameworkElement CreateView() {
        return new BitbucketServerOptionsControl();
    }

}
