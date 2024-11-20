#nullable enable

using Fluid;
using System.Collections.Generic;

namespace GitWebLinks;

public class PrivateHandlerDefinition : HandlerDefinition {

    public PrivateHandlerDefinition(
        string name,
        BranchRefType branchRef,
        IReadOnlyList<string> settingsKeys,
        IFluidTemplate url,
        IReadOnlyList<QueryModification> query,
        IFluidTemplate selection,
        ReverseSettings reverse,
        string serverSettingsKey
    ) : base(name, branchRef, settingsKeys, url, query, selection, reverse) {
        ServerSettingsKey = serverSettingsKey;
    }


    public string ServerSettingsKey { get; }

}
