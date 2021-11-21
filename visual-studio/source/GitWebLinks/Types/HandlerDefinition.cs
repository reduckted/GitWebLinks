#nullable enable

using DotLiquid;
using System.Collections.Generic;

namespace GitWebLinks;

public class HandlerDefinition {

    public HandlerDefinition(
        string name,
        BranchRefType branchRef,
        IReadOnlyList<string> settingsKeys,
        Template url,
        IReadOnlyList<QueryModification> query,
        Template selection,
        ReverseSettings reverse
    ) {
        Name = name;
        BranchRef = branchRef;
        SettingsKeys = settingsKeys;
        Url = url;
        Query = query;
        Selection = selection;
        Reverse = reverse;
    }


    public string Name { get; }


    public BranchRefType BranchRef { get; }


    public IReadOnlyList<string> SettingsKeys { get; }


    public Template Url { get; }


    public IReadOnlyList<QueryModification> Query { get; }


    public Template Selection { get; }


    public ReverseSettings Reverse { get; }

}
