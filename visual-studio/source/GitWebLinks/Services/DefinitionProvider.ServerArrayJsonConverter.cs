using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace GitWebLinks;

public static partial class DefinitionProvider {

    private class ServerArrayJsonConverter : JsonConverter<IReadOnlyList<JsonServer>> {

        public override IReadOnlyList<JsonServer>? ReadJson(JsonReader reader, Type objectType, IReadOnlyList<JsonServer>? existingValue, bool hasExistingValue, JsonSerializer serializer) {
            JToken token;


            token = JToken.Load(reader);

            if (token.Type == JTokenType.Object) {
                return [token.ToObject<JsonServer>(serializer)!];
            }

            return token.ToObject<IReadOnlyList<JsonServer>>();
        }


        public override void WriteJson(JsonWriter writer, IReadOnlyList<JsonServer>? value, JsonSerializer serializer) {
            throw new NotSupportedException();
        }

    }

}
