#nullable enable

using Fluid;
using System.Collections.Generic;

namespace GitWebLinks;

public class HandlerDefinition {

    public HandlerDefinition(
        string name,
        BranchRefType branchRef,
        bool supportsTags,
        IReadOnlyList<string> settingsKeys,
        IFluidTemplate url,
        IReadOnlyList<QueryModification> query,
        IFluidTemplate selection,
        ReverseSettings reverse
    ) {
        Name = name;
        BranchRef = branchRef;
        SupportsTags = supportsTags;
        SettingsKeys = settingsKeys;
        Url = url;
        Query = query;
        Selection = selection;
        Reverse = reverse;
    }


    public string Name { get; }


    public BranchRefType BranchRef { get; }


    public bool SupportsTags { get; }


    public IReadOnlyList<string> SettingsKeys { get; }


    public IFluidTemplate Url { get; }


    public IReadOnlyList<QueryModification> Query { get; }


    public IFluidTemplate Selection { get; }


    public ReverseSettings Reverse { get; }

}
