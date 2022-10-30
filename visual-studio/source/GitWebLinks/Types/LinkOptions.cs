#nullable enable

namespace GitWebLinks;

public class LinkOptions {

    public LinkOptions(ILinkTarget target) {
        Target = target;
    }


    public ILinkTarget Target { get; }

}
