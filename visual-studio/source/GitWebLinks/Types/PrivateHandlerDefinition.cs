using Fluid;

namespace GitWebLinks;

public class PrivateHandlerDefinition : HandlerDefinition {

    public PrivateHandlerDefinition(
        string name,
        BranchRefType branchRef,
        bool supportsTags,
        IReadOnlyList<string> settingsKeys,
        IFluidTemplate url,
        IReadOnlyList<QueryModification> query,
        IFluidTemplate selection,
        ReverseSettings reverse,
        string serverSettingsKey
    ) : base(name, branchRef, supportsTags, settingsKeys, url, query, selection, reverse) {
        ServerSettingsKey = serverSettingsKey;
    }


    public string ServerSettingsKey { get; }

}
