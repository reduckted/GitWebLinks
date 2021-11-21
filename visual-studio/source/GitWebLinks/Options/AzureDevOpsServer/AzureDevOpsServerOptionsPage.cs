#nullable enable

using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[Guid("4500d9f7-0be9-4da0-a54c-24ba3980f1bc")]
public class AzureDevOpsServerOptionsPage : ServerOptionsPageBase {

    public const string Name = "Azure Dev Ops Server";
    public const short ResourceID = 203;


    protected override FrameworkElement CreateView() => new AzureDevOpsServerOptionsControl();

}
