using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class CustomTest {

    public string Name { get; set; } = "";


    public Dictionary<string, JToken> Settings { get; } = [];


    public string Remote { get; set; } = "";


    public string? FileName { get; set; }


    public string? Branch { get; set; }


    public LinkType? LinkType { get; set; }


    public CustomTestSelection? Selection { get; set; }


    public string Result { get; set; } = "";

}
