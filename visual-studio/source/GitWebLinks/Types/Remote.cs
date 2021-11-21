#nullable enable

namespace GitWebLinks;

public class Remote {

    public Remote(string name, string url) {
        Name = name;
        Url = url;
    }


    public string Name { get; }


    public string Url { get; }

}
