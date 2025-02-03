#nullable enable

namespace GitWebLinks;

public class UrlInfo {

    public UrlInfo(string filePath, StaticServer server, PartialSelectedRange selection) {
        FilePath = filePath;
        Server = server;
        Selection = selection;
    }


    public string FilePath { get; }


    public StaticServer Server { get; }


    public PartialSelectedRange Selection { get; }


    public override string ToString() {
        return $"{{FilePath = {FilePath}, Server = {Server}, Selection = {Selection}}}";
    }

}
