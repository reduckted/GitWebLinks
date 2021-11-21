namespace GitWebLinks;

public class UrlTests {

    public RemoteUrlTests Remotes { get; } = new();


    public UrlTest Spaces { get; } = new();


    public IList<CustomTest> Misc { get; } = new List<CustomTest>();


    public UrlTest Branch { get; } = new();


    public UrlTest Commit { get; } = new();


    public SelectionTests Selection { get; } = new();

}
