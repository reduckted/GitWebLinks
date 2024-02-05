#nullable enable

namespace GitWebLinks;

public class CreateUrlResult {

    public CreateUrlResult(string url, string relativePath, string selection) {
        Url = url;
        RelativePath = relativePath;
        Selection = selection;
    }


    public string Url { get; }


    public string RelativePath { get; }


    public string Selection { get; }

}
