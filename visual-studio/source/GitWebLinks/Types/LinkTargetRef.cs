#nullable enable

namespace GitWebLinks;

public class LinkTargetRef : ILinkTarget {

    public LinkTargetRef(RefInfo refInfo, RefType type) {
        RefInfo = refInfo;
        Type = type;
    }


    public RefInfo RefInfo { get; }


    public RefType Type { get; }

}
