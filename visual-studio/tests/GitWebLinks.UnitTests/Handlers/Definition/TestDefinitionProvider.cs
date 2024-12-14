using Newtonsoft.Json;
using System.Reflection;

namespace GitWebLinks;

public static class TestDefinitionProvider {

    private static readonly JsonSerializerSettings SerializerSettings = new() {
        Converters = [
            new StringArrayJsonConverter()
        ]
    };


    private static IReadOnlyCollection<HandlerTestDefinition>? _definitions;


    public static IReadOnlyCollection<HandlerTestDefinition> GetDefinitions() {
        if (_definitions is null) {
            Assembly container;
            List<HandlerTestDefinition> definitions;


            definitions = [];
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


    private static HandlerTestDefinition LoadDefinition(Stream stream) {
        using (JsonTextReader reader = new(new StreamReader(stream))) {
            HandlerTestDefinition? definition;


            definition = JsonSerializer.CreateDefault(SerializerSettings).Deserialize<HandlerTestDefinition>(reader);

            if (definition is null) {
                throw new InvalidDataException("Failed to deserialize handler definition.");
            }

            return definition;
        }
    }

}
