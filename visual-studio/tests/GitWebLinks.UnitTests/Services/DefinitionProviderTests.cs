namespace GitWebLinks;

public class DefinitionProviderTests {

    [Fact]
    public void CanLoadDefinitions() {
        // This test is really just a way to debug the definition loading.
        Assert.NotEmpty(DefinitionProvider.GetDefinitions().ToList());
    }

}
