namespace GitWebLinks;

public static class RepositoryFinderTests {

    public class HasRepositoriesMethod : RepositoryTestBase {

        private readonly RepositoryFinder _finder;


        public HasRepositoriesMethod() {
            _finder = new(Git, NullLogger.Instance);
        }


        [Fact]
        public async Task ShouldReturnFalseWhenTheDirectoryIsNotInGitRepository() {
            Assert.False(await _finder.HasRepositoriesAsync(RootDirectory));
        }


        [Fact]
        public async Task ShouldReturnFalseWhenTheDirectoryDoesNotContainAnyGitRepositories() {
            CreateDirectory("a/b/c");
            CreateDirectory("d/e/f");

            Assert.False(await _finder.HasRepositoriesAsync(RootDirectory));
        }


        [Fact]
        public async Task ShouldReturnTrueWhenTheDirectoryIsAtTheRootOfTheRepository() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.True(await _finder.HasRepositoriesAsync(RootDirectory));
        }


        [Fact]
        public async Task ShouldReturnTrueWhenTheDirectoryIsWithinRepository() {
            string child;

            await SetupRepositoryAsync(RootDirectory);

            child = CreateDirectory("child");

            Assert.True(await _finder.HasRepositoriesAsync(child));
        }


        [Theory]
        [InlineData("first")]
        [InlineData("first/second")]
        [InlineData("first/second/third")]
        public async Task ShouldReturnTrueWhenTheDirectoryContainsRepositoryInChildDirectory(string path) {
            string child;


            child = CreateDirectory(path);
            await SetupRepositoryAsync(child);

            Assert.True(await _finder.HasRepositoriesAsync(RootDirectory));
        }


        [Theory]
        [InlineData("node_modules")]
        [InlineData("bin")]
        [InlineData(".vscode")]
        [InlineData(".vs")]
        [InlineData(".github")]
        public async Task ShouldIgnoreSpecialDirectories(string directory) {
            string child;


            child = CreateDirectory(directory);
            await SetupRepositoryAsync(child);

            Assert.False(await _finder.HasRepositoriesAsync(RootDirectory));
        }

    }


    public class FindRepositoryMethod : RepositoryTestBase {

        private readonly RepositoryFinder _finder;


        public FindRepositoryMethod() {
            _finder = new(Git, NullLogger.Instance);
        }


        [Fact]
        public async Task ShouldNotFindTheInfoWhenThePathIsNinInGitRepository() {
            Assert.Null(await _finder.FindRepositoryAsync(RootDirectory));
        }


        [Fact]
        public async Task ShouldFindTheInfoWhenThePathIsTheRootOfTheRepository() {
            await SetupRepositoryAsync(RootDirectory);
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "origin", "https://github.com/example/repo");

            Assert.Equal(
                new Repository(RootDirectory, new Remote("origin", "https://github.com/example/repo")),
                await _finder.FindRepositoryAsync(RootDirectory),
                RepositoryComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldFindTheInfoWhenThePathIsBelowTheRootOfTheRepository() {
            string child;


            await SetupRepositoryAsync(RootDirectory);
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "origin", "https://github.com/example/repo");

            child = CreateDirectory("child");

            Assert.Equal(
                new Repository(RootDirectory, new Remote("origin", "https://github.com/example/repo")),
                await _finder.FindRepositoryAsync(child),
                RepositoryComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldFindTheInfoWhenStartingFromFile() {
            string file;


            await SetupRepositoryAsync(RootDirectory);
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "origin", "https://github.com/example/repo");

            file = CreateFile("file.txt");

            Assert.Equal(
                new Repository(RootDirectory, new Remote("origin", "https://github.com/example/repo")),
                await _finder.FindRepositoryAsync(file),
                RepositoryComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldFindTheInfoWhenTheFileIsInGitWorktree() {
            string repo;
            string worktree;


            repo = CreateDirectory("repo");
            worktree = CreateDirectory("worktree");

            await SetupRepositoryAsync(repo);
            await Git.ExecuteAsync(repo, "remote", "add", "origin", "https://github.com/example/repo");
            await Git.ExecuteAsync(repo, "worktree", "add", worktree);

            Assert.Equal(
                new Repository(worktree, new Remote("origin", "https://github.com/example/repo")),
                await _finder.FindRepositoryAsync(worktree),
                RepositoryComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldUseTheOriginRemoteIfItExists() {
            await SetupRepositoryAsync(RootDirectory);
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "alpha", "https://github.com/example/alpha");
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "beta", "https://github.com/example/beta");
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "origin", "https://github.com/example/repo");

            Assert.Equal(
                new Repository(RootDirectory, new Remote("origin", "https://github.com/example/repo")),
                await _finder.FindRepositoryAsync(RootDirectory),
                RepositoryComparer.Instance
            );
        }


        [Fact]
        public async Task ShouldUseTheFirstRemoteAlphabeticallyWhenTheOriginRemoteDoesNotExist() {
            await SetupRepositoryAsync(RootDirectory);
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "beta", "https://github.com/example/beta");
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "alpha", "https://github.com/example/alpha");
            await Git.ExecuteAsync(RootDirectory, "remote", "add", "gamma", "https://github.com/example/gamma");

            Assert.Equal(
                new Repository(RootDirectory, new Remote("alpha", "https://github.com/example/alpha")),
                await _finder.FindRepositoryAsync(RootDirectory),
                RepositoryComparer.Instance
            );
        }

    }


    public class FindRepositoriesMethod : RepositoryTestBase {

        private readonly RepositoryFinder _finder;


        public FindRepositoriesMethod() {
            _finder = new(Git, NullLogger.Instance);
        }


        [Fact]
        public async Task ShouldReturnEmptyCollectionWhenTheDirectoryIsNotInGitRepository() {
            Assert.Empty(await FindRoots(RootDirectory));
        }


        [Fact]
        public async Task ShouldReturnEmptyCollectionWhenTheDirectoryDoesNotContainAnyGitRepositories() {
            CreateDirectory("a/b/c");
            CreateDirectory("d/e/f");

            Assert.Empty(await FindRoots(RootDirectory));
        }


        [Fact]
        public async Task ShouldReturnOneRepositoryWhenTheDirectoryIsAtTheRootOfTheRepository() {
            await SetupRepositoryAsync(RootDirectory);

            Assert.Equal(
                new[] { RootDirectory },
                await FindRoots(RootDirectory)
            );
        }


        [Fact]
        public async Task ShouldReturnOneRepositoryWhenTheDirectoryIsWithinRepository() {
            string child;


            await SetupRepositoryAsync(RootDirectory);

            child = CreateDirectory("child");

            Assert.Equal(
                new[] { RootDirectory },
                await FindRoots(child)
            );
        }


        [Theory]
        [InlineData("first")]
        [InlineData("first/second")]
        [InlineData("first/second/third")]
        public async Task ShouldReturnOneRepositoryWhenTheWorkspaceContainsRepositoryInChildDirectory(string path) {
            string child;


            child = CreateDirectory(path);
            await SetupRepositoryAsync(child);

            Assert.Equal(
                new[] { child },
                await FindRoots(RootDirectory)
            );
        }


        [Theory]
        [InlineData("node_modules")]
        [InlineData("bin")]
        [InlineData(".vscode")]
        [InlineData(".vs")]
        [InlineData(".github")]
        public async Task ShouldIgnoreSpecialDirectories(string path) {
            string child;


            child = CreateDirectory(path);
            await SetupRepositoryAsync(child);

            Assert.Empty(await FindRoots(RootDirectory));
        }


        [Fact]
        public async Task ShouldFindAllRepositoriesWithinTheDirector() {
            string alpha;
            string beta;
            string gamma;
            string delta;


            alpha = CreateDirectory("top/alpha");
            beta = CreateDirectory("top/beta");
            gamma = CreateDirectory("top/second/gamma");
            delta = CreateDirectory("top/second/third/fourth/delta");
            CreateDirectory("top/second/other");

            await SetupRepositoryAsync(alpha);
            await SetupRepositoryAsync(beta);
            await SetupRepositoryAsync(gamma);
            await SetupRepositoryAsync(delta);

            Assert.Equal(
                new[] { alpha, beta, gamma, delta },
                (await FindRoots(RootDirectory)).OrderBy((x) => x)
            );
        }


        [Fact]
        public async Task ShouldGetTheRemoteForEachRepository() {
            string alpha;
            string beta;
            string gamma;
            List<Repository> repositories;


            alpha = CreateDirectory("alpha");
            beta = CreateDirectory("beta");
            gamma = CreateDirectory("gamma");

            await SetupRepositoryAsync(alpha);
            await SetupRepositoryAsync(beta);
            await SetupRepositoryAsync(gamma);

            await Git.ExecuteAsync(alpha, "remote", "add", "origin", "https://github.com/example/alpha");
            await Git.ExecuteAsync(gamma, "remote", "add", "origin", "https://github.com/example/gamma");

            repositories = new List<Repository>();

            await foreach (Repository repository in _finder.FindRepositoriesAsync(RootDirectory)) {
                repositories.Add(repository);
            }

            repositories.Sort((x, y) => string.Compare(x.Root, y.Root, StringComparison.Ordinal));

            Assert.Equal(
                new[] {
                    new Repository(alpha, new Remote("origin","https://github.com/example/alpha")),
                    new Repository(beta, null),
                    new Repository(gamma,new Remote("origin", "https://github.com/example/gamma"))
                },
                repositories,
                RepositoryComparer.Instance
            );
        }


        private async Task<IEnumerable<string>> FindRoots(string directory) {
            List<string> repositories;


            repositories = new List<string>();

            await foreach (Repository repository in _finder.FindRepositoriesAsync(directory)) {
                repositories.Add(repository.Root);
            }

            return repositories;
        }

    }


    private class RepositoryComparer : IEqualityComparer<Repository?> {

        public static RepositoryComparer Instance { get; } = new RepositoryComparer();


        public bool Equals(Repository? x, Repository? y) {
            if (x is null) {
                return y is null;
            }

            if (y is null) {
                return false;
            }

            if (!string.Equals(x.Root, y.Root, StringComparison.Ordinal)) {
                return false;
            }

            if (x.Remote is null) {
                return y.Remote is null;
            }

            if (y.Remote is null) {
                return false;
            }

            return string.Equals(x.Remote.Name, y.Remote.Name, StringComparison.Ordinal) &&
                   string.Equals(x.Remote.Url, y.Remote.Url, StringComparison.Ordinal);
        }


        public int GetHashCode(Repository? obj) {
            return 0;
        }

    }

}
