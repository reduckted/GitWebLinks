namespace GitWebLinks;

public abstract class RepositoryTestBase : DirectoryTestBase {

    protected Git Git { get; } = new Git(NullLogger.Instance);


    protected async Task SetupRepositoryAsync(string root) {
        // Ensure that the default branch name matches what the tests are expecting
        // (`master` because the tests were written before `main` became the default).
        // The default branch can be specified in the git configuration, but we
        // don't want to change the global configuration when running the tests.
        await Git.ExecuteAsync(root, "init", "--initial-branch=master");
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
