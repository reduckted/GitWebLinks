#nullable enable

using System.Text.RegularExpressions;

namespace GitWebLinks;

public class QueryModification {

    public QueryModification(Regex pattern, string key, string value) {
        Pattern = pattern;
        Key = key;
        Value = value;
    }


    public Regex Pattern { get; }


    public string Key { get; }


    public string Value { get; }

}
