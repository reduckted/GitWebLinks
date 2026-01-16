namespace GitWebLinks;

public static class UrlHelpersTests {

    public class NormalizeMethod {

        [Fact]
        public void ShouldRemoveTheUsernameFromHttpUrls() {
            Assert.Equal("http://example.com", UrlHelpers.Normalize("http://me@example.com"));
        }


        [Fact]
        public void ShouldRemoveTheUsernameFromHttpsUrls() {
            Assert.Equal("https://example.com", UrlHelpers.Normalize("https://me@example.com"));
        }


        [Fact]
        public void ShouldNotChangeTheHttpUrlIfItDoesNotContainUsername() {
            Assert.Equal("http://example.com", UrlHelpers.Normalize("http://example.com"));
        }


        [Fact]
        public void ShouldRemoveTheSshPrefix() {
            Assert.Equal("example.com", UrlHelpers.Normalize("ssh://example.com"));
        }


        [Fact]
        public void ShouldRemoveTheGitAtUserSpecificationPrefix() {
            Assert.Equal("example.com", UrlHelpers.Normalize("git@example.com"));
        }


        [Fact]
        public void ShouldRemoveNonStandardUserSpecificationPrefix() {
            Assert.Equal("example.com", UrlHelpers.Normalize("foo@example.com"));
        }


        [Fact]
        public void ShouldRemoveTheSshPrefixAndTheGitAtPrefix() {
            Assert.Equal("example.com", UrlHelpers.Normalize("ssh://git@example.com"));
        }


        [Fact]
        public void ShouldNotChangeTheSshUrlIfItDoesNotContainTheSshPrefix() {
            Assert.Equal("example.com", UrlHelpers.Normalize("example.com"));
        }


        [Fact]
        public void ShouldRemoveTheTrailingSlashFromHttpUrls() {
            Assert.Equal("http://example.com", UrlHelpers.Normalize("http://example.com/"));
        }


        [Fact]
        public void ShouldRemoveTheTrailingSlashFromSshUrls() {
            Assert.Equal("example.com", UrlHelpers.Normalize("ssh://example.com/"));
        }

    }


    public class GetSshUserSpecificationMethod {

        [Fact]
        public void ShouldReturnEmptyStringForHttpUrls() {
            Assert.Equal("", UrlHelpers.GetSshUserSpecification("http://me@example.com"));
        }


        [Fact]
        public void ShouldReturnEmptyStringForHttpsUrls() {
            Assert.Equal("", UrlHelpers.GetSshUserSpecification("https://me@example.com"));
        }


        [Theory]
        [InlineData("git")]
        [InlineData("foo")]
        public void ShouldReturnUserSpecificationFromSshUrlsWithProtocol(string user) {
            Assert.Equal(user, UrlHelpers.GetSshUserSpecification($"ssh://{user}@example.com"));
        }


        [Theory]
        [InlineData("git")]
        [InlineData("foo")]
        public void ShouldReturnUserSpecificationFromSshUrlsWithoutProtocol(string user) {
            Assert.Equal(user, UrlHelpers.GetSshUserSpecification($"{user}@example.com"));
        }

    }

}
