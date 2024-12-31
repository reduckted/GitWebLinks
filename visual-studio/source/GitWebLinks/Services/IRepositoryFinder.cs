#nullable enable

using System.Collections.Generic;
using System.Threading.Tasks;

namespace GitWebLinks;

public interface IRepositoryFinder {

    IAsyncEnumerable<Repository> FindRepositoriesAsync(string directory);


    Task<Repository?> FindRepositoryAsync(string path);


    Task<bool> HasRepositoriesAsync(string directory);

}
