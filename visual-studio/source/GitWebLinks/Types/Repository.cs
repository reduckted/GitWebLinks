#nullable enable

namespace GitWebLinks;

public class Repository {

    public Repository(string root, Remote? remote) {
        Root = root;
        Remote = remote;
    }


    public string Root { get; }


    public Remote? Remote { get; }

}
