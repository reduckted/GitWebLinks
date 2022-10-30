#nullable enable

namespace GitWebLinks;

public class LinkTargetPreset : ILinkTarget {

    public LinkTargetPreset(LinkType? type) {
        Type = type;
    }


    public LinkType? Type { get; }

}
