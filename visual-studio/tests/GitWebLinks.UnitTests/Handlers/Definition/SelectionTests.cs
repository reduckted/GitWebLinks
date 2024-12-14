using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class SelectionTests {

    public Dictionary<string, JToken> Settings { get; } = [];


    public string Remote { get; set; } = "";


    public SelectionPointTest Point { get; } = new();


    public SelectionSingleLineTest SingleLine { get; } = new();


    public SelectionMultipleLinesTest MultipleLines { get; } = new();

}
