#nullable enable

using DotLiquid;
using System.Collections.Generic;

namespace GitWebLinks;

public class PublicHandlerDefinition : HandlerDefinition {

    public PublicHandlerDefinition(
        string name,
        BranchRefType branchRef,
        IReadOnlyList<string> settingsKeys,
        Template url,
        IReadOnlyList<QueryModification> query,
        Template selection,
        ReverseSettings reverse,
        IReadOnlyList<IServer> servers
    ) : base(name, branchRef, settingsKeys, url, query, selection, reverse) {
        Servers = servers;
    }


    public IReadOnlyList<IServer> Servers { get; }

}
