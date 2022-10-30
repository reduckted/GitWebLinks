#nullable enable

using Community.VisualStudio.Toolkit;

namespace GitWebLinks;

[Command(PackageIds.Command_CopyLinkToFile)]
public class CopyLinkToFileCommand : GetLinkCommandBase<CopyLinkToFileCommand> {
    protected override bool IncludeSelection => false;
    protected override CommandLinkType LinkType => CommandLinkType.UseDefault;
    protected override CommandAction Action => CommandAction.Copy;
    protected override bool IsVisible(GeneralOptionsPage options) => options.ShowCopyLinkMenuItem;
}


[Command(PackageIds.Command_CopyLinkToSelection)]
public class CopyLinkToSelectionCommand : GetLinkCommandBase<CopyLinkToSelectionCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.UseDefault;
    protected override CommandAction Action => CommandAction.Copy;
    protected override bool IsVisible(GeneralOptionsPage options) => options.ShowCopyLinkMenuItem;
}


[Command(PackageIds.Command_CopyLinkToSelectionAtCurrentCommit)]
public class CopyLinkToSelectionAtCurrentCommitCommand : GetLinkCommandBase<CopyLinkToSelectionAtCurrentCommitCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.Commit;
    protected override CommandAction Action => CommandAction.Copy;
}


[Command(PackageIds.Command_CopyLinkToSelectionOnCurrentBranch)]
public class CopyLinkToSelectionOnCurrentBranchCommand : GetLinkCommandBase<CopyLinkToSelectionOnCurrentBranchCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.CurrentBranch;
    protected override CommandAction Action => CommandAction.Copy;
}


[Command(PackageIds.Command_CopyLinkToSelectionOnDefaultBranch)]
public class CopyLinkToSelectionOnDefaultBranchCommand : GetLinkCommandBase<CopyLinkToSelectionOnDefaultBranchCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.DefaultBranch;
    protected override CommandAction Action => CommandAction.Copy;
}


[Command(PackageIds.Command_CopyLinkToSelectionForTarget)]
public class CopyLinkToSelectionForTargetCommand : GetLinkCommandBase<CopyLinkToSelectionForTargetCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.Prompt;
    protected override CommandAction Action => CommandAction.Copy;
}


[Command(PackageIds.Command_OpenLinkToFile)]
public class OpenLinkToFileCommand : GetLinkCommandBase<OpenLinkToFileCommand> {
    protected override bool IncludeSelection => false;
    protected override CommandLinkType LinkType => CommandLinkType.UseDefault;
    protected override CommandAction Action => CommandAction.Open;
    protected override bool IsVisible(GeneralOptionsPage options) => options.ShowOpenLinkMenuItem;
}


[Command(PackageIds.Command_OpenLinkToSelection)]
public class OpenLinkToSelectionCommand : GetLinkCommandBase<OpenLinkToSelectionCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.UseDefault;
    protected override CommandAction Action => CommandAction.Open;
    protected override bool IsVisible(GeneralOptionsPage options) => options.ShowOpenLinkMenuItem;
}


[Command(PackageIds.Command_OpenLinkToSelectionAtCurrentCommit)]
public class OpenLinkToSelectionAtCurrentCommitCommand : GetLinkCommandBase<OpenLinkToSelectionAtCurrentCommitCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.Commit;
    protected override CommandAction Action => CommandAction.Open;
}


[Command(PackageIds.Command_OpenLinkToSelectionOnCurrentBranch)]
public class OpenLinkToSelectionOnCurrentBranchCommand : GetLinkCommandBase<OpenLinkToSelectionOnCurrentBranchCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.CurrentBranch;
    protected override CommandAction Action => CommandAction.Open;
}


[Command(PackageIds.Command_OpenLinkToSelectionOnDefaultBranch)]
public class OpenLinkToSelectionOnDefaultBranchCommand : GetLinkCommandBase<OpenLinkToSelectionOnDefaultBranchCommand> {
    protected override bool IncludeSelection => true;
    protected override CommandLinkType LinkType => CommandLinkType.DefaultBranch;
    protected override CommandAction Action => CommandAction.Open;
}
