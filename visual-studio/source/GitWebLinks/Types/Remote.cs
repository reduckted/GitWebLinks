#nullable enable

using System.Collections.Generic;
using System.Linq;

namespace GitWebLinks;

public class Remote {

    public Remote(string name, IEnumerable<string> urls) {
        Name = name;
        Urls = urls.ToList();
    }


    public string Name { get; }


    public IReadOnlyList<string> Urls { get; }

}
