namespace GitWebLinks;

public class UrlTests {

    public RemoteUrlTests Remotes { get; } = new();


    public UrlTest Spaces { get; } = new();


    public IList<CustomTest> Misc { get; } = [];


    public UrlTest Branch { get; } = new();


    public UrlTest Commit { get; } = new();


    public UrlTest? Tag { get; set; }


    public SelectionTests Selection { get; } = new();

}
