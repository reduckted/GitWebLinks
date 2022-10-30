#nullable enable

namespace GitWebLinks;

public class RefInfo {

    public RefInfo(string abbreviated, string symbolic) {
        Abbreviated = abbreviated;
        Symbolic = symbolic;
    }


    public string Abbreviated { get; }


    public string Symbolic { get; }

}
