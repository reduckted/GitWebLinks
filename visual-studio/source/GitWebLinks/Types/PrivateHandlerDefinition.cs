#nullable enable

using DotLiquid;
using System.Collections.Generic;

namespace GitWebLinks;

public class PrivateHandlerDefinition : HandlerDefinition {

    public PrivateHandlerDefinition(
        string name,
        BranchRefType branchRef,
        IReadOnlyList<string> settingsKeys,
        Template url,
        IReadOnlyList<QueryModification> query,
        Template selection,
        ReverseSettings reverse,
        string serverSettingsKey
    ) : base(name, branchRef, settingsKeys, url, query, selection, reverse) {
        ServerSettingsKey = serverSettingsKey;
    }


    public string ServerSettingsKey { get; }

}
