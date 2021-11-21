#nullable enable

using DotLiquid;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class TemplateData {

    private readonly Dictionary<string, object?> _data = new();


    public static TemplateData Create() {
        return new TemplateData();
    }


    private TemplateData() { }


    public TemplateData Add(string key, object? value) {
        _data[key] = value;
        return this;
    }


    public TemplateData Add(Match match) {
        // If there is at least one named group, then we'll add the groups to a
        // nested "group" object; otherwise, we'll add the groups as an array.
        if (match.Groups.Cast<Group>().Any((x) => !Regex.IsMatch(x.Name, "^\\d+$"))) {
            Dictionary<string, object?> matchData;
            Dictionary<string, object?> groupsData;


            matchData = new Dictionary<string, object?>();
            groupsData = new Dictionary<string, object?>();

            foreach (var group in match.Groups.OfType<Group>()) {
                groupsData[group.Name] = group.Success ? group.Value : null;
            }

            matchData["groups"] = groupsData;
            _data["match"] = matchData;

        } else {
            _data["match"] = match.Groups.OfType<Group>().Select((x) => x.Success ? x.Value : null).ToArray();
        }

        return this;
    }


    public Hash ToHash() {
        return Hash.FromDictionary(_data);
    }

}
