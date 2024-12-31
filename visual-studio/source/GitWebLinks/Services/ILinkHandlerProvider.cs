#nullable enable

using System.Collections.Generic;
using System.Threading.Tasks;

namespace GitWebLinks;

public interface ILinkHandlerProvider {


    Task<IReadOnlyCollection<UrlInfo>> GetUrlInfoAsync(string webUrl);


    Task<SelectedLinkHandler?> SelectAsync(Repository repository);

}
