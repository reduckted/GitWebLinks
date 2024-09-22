#nullable enable

using DotLiquid;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static partial class DefinitionProvider {

    private static readonly JsonSerializerSettings SerializerSettings = new() {
        Converters = new List<JsonConverter> {
            new StringArrayJsonConverter(),
            new ServerArrayJsonConverter()
        }
    };


    private static IReadOnlyCollection<HandlerDefinition>? _definitions;


    public static IReadOnlyCollection<HandlerDefinition> GetDefinitions() {
        if (_definitions is null) {
            Assembly container;
            List<HandlerDefinition> definitions;


            definitions = new List<HandlerDefinition>();
            container = typeof(LinkHandlerProvider).Assembly;

            foreach (string name in container.GetManifestResourceNames()) {
                if (Path.GetExtension(name) == ".json") {
                    using (Stream stream = container.GetManifestResourceStream(name)) {
                        definitions.Add(LoadDefinition(stream));
                    }
                }
            }

            _definitions = definitions;
        }

        return _definitions;
    }


    private static HandlerDefinition LoadDefinition(Stream stream) {
        JsonHandlerDefinition? json;


        using (JsonTextReader reader = new(new StreamReader(stream))) {
            json = JsonSerializer.CreateDefault(SerializerSettings).Deserialize<JsonHandlerDefinition>(reader);

            if (json is null) {
                throw new InvalidDataException("Failed to deserialize handler definition.");
            }
        }

        if (json.Private is not null) {
            return new PrivateHandlerDefinition(
                json.Name,
                json.BranchRef,
                json.SettingsKeys ?? Array.Empty<string>(),
                Template.Parse(json.Url),
                json.Query is not null ? ParseQueryModifications(json.Query) : Array.Empty<QueryModification>(),
                Template.Parse(json.Selection),
                ParseReverseSettings(json.Reverse),
                json.Private
            );

        } else {
            return new PublicHandlerDefinition(
                json.Name,
                json.BranchRef,
                json.SettingsKeys ?? Array.Empty<string>(),
                Template.Parse(json.Url),
                json.Query is not null ? ParseQueryModifications(json.Query) : Array.Empty<QueryModification>(),
                Template.Parse(json.Selection),
                ParseReverseSettings(json.Reverse),
                ParseServers(json.Server!)
            );
        }
    }


    private static IReadOnlyList<IServer> ParseServers(IReadOnlyList<JsonServer> json) {
        List<IServer> servers;


        servers = new List<IServer>();

        foreach (var server in json) {
            if (server.RemotePattern is not null) {
                servers.Add(
                    new DynamicServer(
                        new Regex(server.RemotePattern),
                        Template.Parse(server.Http),
                        Template.Parse(server.Ssh),
                        (server.WebPattern is not null) ? new Regex(server.WebPattern) : null,
                        (server.Web is not null) ? Template.Parse(server.Web) : null
                    )
                );
            } else {
                servers.Add(new StaticServer(server.Http, server.Ssh, server.Web));
            }
        }

        return servers;
    }


    private static IReadOnlyList<QueryModification> ParseQueryModifications(IReadOnlyList<JsonQueryModification> json) {
        return json.Select((x) => new QueryModification(new Regex(x.Pattern), x.Key, x.Value)).ToList();
    }


    private static ReverseSettings ParseReverseSettings(JsonReverseSettings json) {
        return new ReverseSettings(
            new Regex(json.Pattern),
            Template.Parse(json.File),
            json.FileMayStartWithBranch,
            new ReverseServerSettings(
                Template.Parse(json.Server.Http),
                Template.Parse(json.Server.Ssh),
                (json.Server.Web is not null) ? Template.Parse(json.Server.Web) : null
            ),
            new ReverseSelectionSettings(
                Template.Parse(json.Selection.StartLine),
                json.Selection.StartColumn is not null ? Template.Parse(json.Selection.StartColumn) : null,
                json.Selection.EndLine is not null ? Template.Parse(json.Selection.EndLine) : null,
                json.Selection.EndColumn is not null ? Template.Parse(json.Selection.EndColumn) : null
            )
        );
    }

}
