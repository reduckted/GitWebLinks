#nullable enable

using Fluid;
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
            FluidParser parser;


            definitions = new List<HandlerDefinition>();
            container = typeof(LinkHandlerProvider).Assembly;
            parser = new FluidParser();

            foreach (string name in container.GetManifestResourceNames()) {
                if (Path.GetExtension(name) == ".json") {
                    using (Stream stream = container.GetManifestResourceStream(name)) {
                        definitions.Add(LoadDefinition(stream, parser));
                    }
                }
            }

            _definitions = definitions;
        }

        return _definitions;
    }


    private static HandlerDefinition LoadDefinition(Stream stream, FluidParser parser) {
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
                parser.Parse(json.Url),
                json.Query is not null ? ParseQueryModifications(json.Query) : Array.Empty<QueryModification>(),
                parser.Parse(json.Selection),
                ParseReverseSettings(json.Reverse, parser),
                json.Private
            );

        } else {
            return new PublicHandlerDefinition(
                json.Name,
                json.BranchRef,
                json.SettingsKeys ?? Array.Empty<string>(),
                parser.Parse(json.Url),
                json.Query is not null ? ParseQueryModifications(json.Query) : Array.Empty<QueryModification>(),
                parser.Parse(json.Selection),
                ParseReverseSettings(json.Reverse, parser),
                ParseServers(json.Server!, parser)
            );
        }
    }


    private static IReadOnlyList<IServer> ParseServers(IReadOnlyList<JsonServer> json, FluidParser parser) {
        List<IServer> servers;


        servers = new List<IServer>();

        foreach (var server in json) {
            if (server.RemotePattern is not null) {
                servers.Add(
                    new DynamicServer(
                        new Regex(server.RemotePattern),
                        parser.Parse(server.Http),
                        parser.Parse(server.Ssh),
                        (server.WebPattern is not null) ? new Regex(server.WebPattern) : null,
                        (server.Web is not null) ? parser.Parse(server.Web) : null
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


    private static ReverseSettings ParseReverseSettings(JsonReverseSettings json, FluidParser parser) {
        return new ReverseSettings(
            new Regex(json.Pattern),
            parser.Parse(json.File),
            json.FileMayStartWithBranch,
            new ReverseServerSettings(
                parser.Parse(json.Server.Http),
                parser.Parse(json.Server.Ssh),
                (json.Server.Web is not null) ? parser.Parse(json.Server.Web) : null
            ),
            new ReverseSelectionSettings(
                parser.Parse(json.Selection.StartLine),
                json.Selection.StartColumn is not null ? parser.Parse(json.Selection.StartColumn) : null,
                json.Selection.EndLine is not null ? parser.Parse(json.Selection.EndLine) : null,
                json.Selection.EndColumn is not null ? parser.Parse(json.Selection.EndColumn) : null
            )
        );
    }

}
