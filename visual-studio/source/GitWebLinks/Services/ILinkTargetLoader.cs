#nullable enable

using System.Collections.Generic;
using System.Threading.Tasks;

namespace GitWebLinks;

public interface ILinkTargetLoader {

    Task<IReadOnlyList<LinkTargetListItem>> LoadAsync();

}
