#nullable enable

using Newtonsoft.Json;
using System;

namespace GitWebLinks;

public class StringArrayJsonConverter : JsonConverter<string> {

    public override string? ReadJson(JsonReader reader, Type objectType, string? existingValue, bool hasExistingValue, JsonSerializer serializer) {
        if (reader.TokenType == JsonToken.String) {
            string? s = (string?)reader.Value;
            return s;
        }

        if (reader.TokenType == JsonToken.StartArray) {
            string[] values;


            values = serializer.Deserialize<string[]>(reader) ?? Array.Empty<string>();

            return string.Concat(values);
        }

        throw new JsonSerializationException($"Expected string but found {reader.TokenType}.");
    }


    public override void WriteJson(JsonWriter writer, string? value, JsonSerializer serializer) {
        throw new NotSupportedException();
    }

}
