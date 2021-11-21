using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class RemoteUrlTests {

    public Dictionary<string, JToken> Settings { get; } = new();


    public string Http { get; set; } = "";


    public string HttpWithUsername { get; set; } = "";


    public string Ssh { get; set; } = "";


    public string SshWithProtocol { get; set; } = "";


    public string Result { get; set; } = "";

}
