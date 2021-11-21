using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public class HandlerTestData {

    public Dictionary<string, JToken> Settings { get; } = new();


    public UrlTests CreateUrl { get; } = new();

}
