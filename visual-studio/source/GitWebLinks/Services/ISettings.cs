#nullable enable

using System.Collections.Generic;
using System.Threading.Tasks;

namespace GitWebLinks;

public interface ISettings {

    Task<string> GetDefaultBranchAsync();


    Task<LinkType> GetDefaultLinkTypeAsync();


    Task<string> GetPreferredRemoteNameAsync();


    Task<bool> GetUseShortHashesAsync();


    Task<object?> GetHandlerSettingAsync(string key);


    Task<IReadOnlyList<StaticServer>> GetServersAsync(string type);

}
