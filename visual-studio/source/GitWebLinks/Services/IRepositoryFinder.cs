namespace GitWebLinks;

public interface IRepositoryFinder {

    IAsyncEnumerable<Repository> FindRepositoriesAsync(string directory);


    Task<Repository?> FindRepositoryAsync(string path);

}
