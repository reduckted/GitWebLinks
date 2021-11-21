namespace GitWebLinks;

public abstract class RepositoryTestBase : DirectoryTestBase {

    protected Git Git { get; } = new Git(NullLogger.Instance);


    protected async Task SetupRepositoryAsync(string root) {
        await Git.ExecuteAsync(root, "init");
        await Git.ExecuteAsync(root, "config", "user.email", "foo@example.com");
        await Git.ExecuteAsync(root, "config", "user.name", "foo");
        await Git.ExecuteAsync(root, "config", "commit.gpgsign", "false");

        using (File.Create(Path.Combine(root, "file"))) { }

        await Git.ExecuteAsync(root, "add", ".");
        await Git.ExecuteAsync(root, "commit", "-m", "\"initial\"");
    }


    protected async Task SetupRemoteAsync(string repositoryRoot, string remoteRepositoryRoot, string remoteName) {
        await Git.ExecuteAsync(remoteRepositoryRoot, "init", "--bare");
        await Git.ExecuteAsync(repositoryRoot, "remote", "add", remoteName, remoteRepositoryRoot);
        await Git.ExecuteAsync(repositoryRoot, "push", remoteName, "master");
    }

}
