using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class UrlTest {

    public Dictionary<string, JToken> Settings { get; } = new();


    public string Remote { get; set; } = "";


    public string Result { get; set; } = "";

}
