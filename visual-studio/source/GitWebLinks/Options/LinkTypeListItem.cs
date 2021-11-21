#nullable enable

namespace GitWebLinks;

public class LinkTypeListItem {

    public LinkTypeListItem(LinkType value) {
        Value = value;

        Name = value switch {
            LinkType.Commit => "Current Commit",
            LinkType.CurrentBranch => "Current Branch",
            LinkType.DefaultBranch => "Default Branch",
            _ => "?"
        };
    }


    public string Name { get; }


    public LinkType Value { get; }

}
