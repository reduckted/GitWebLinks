#nullable enable

using Fluid;
using Fluid.Values;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace GitWebLinks;

public static class TemplateEngine {

    private static bool _initialized;


    public static TemplateOptions Options = new();


    public static void Initialize() {
        if (!_initialized) {
            Options.Filters.AddFilter("filename", Filters.FilenameAsync);
            Options.Filters.AddFilter("encode_uri", Filters.EncodeUriAsync);
            Options.Filters.AddFilter("encode_uri_component", Filters.EncodeUriComponentAsync);
            Options.Filters.AddFilter("encode_uri_component_segments", Filters.EncodeUriComponentSegmentsAsync);
            Options.Filters.AddFilter("decode_uri", Filters.DecodeUriAsync);
            Options.Filters.AddFilter("decode_uri_component", Filters.DecodeUriComponentAsync);
            Options.Filters.AddFilter("decode_uri_component_segments", Filters.DecodeUriComponentSegmentsAsync);
            _initialized = true;
        }
    }


    private class Filters {

        public static ValueTask<FluidValue> FilenameAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(Path.GetFileName(value.ToStringValue()));
        }


        public static ValueTask<FluidValue> EncodeUriAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(Uri.EscapeUriString(value.ToStringValue()));
        }


        public static ValueTask<FluidValue> EncodeUriComponentAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(Uri.EscapeDataString(value.ToStringValue()));
        }


        public static ValueTask<FluidValue> EncodeUriComponentSegmentsAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(
                string.Join("/", value.ToStringValue().Split('/').Select(Uri.EscapeDataString))
            );
        }


        public static ValueTask<FluidValue> DecodeUriAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(Uri.UnescapeDataString(value.ToStringValue()));
        }


        public static ValueTask<FluidValue> DecodeUriComponentAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(Uri.UnescapeDataString(value.ToStringValue()));
        }


        public static ValueTask<FluidValue> DecodeUriComponentSegmentsAsync(
            FluidValue value,
            FilterArguments arguments,
            TemplateContext context
        ) {
            return StringValue.Create(
                string.Join("/", value.ToStringValue().Split('/').Select(Uri.UnescapeDataString))
            );
        }
    }

}
