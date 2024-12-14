using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class HandlerTestData {

    public Dictionary<string, JToken> Settings { get; } = [];


    public UrlTests CreateUrl { get; } = new();

}
