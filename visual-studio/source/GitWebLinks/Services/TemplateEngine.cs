#nullable enable

using DotLiquid;
using System;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class TemplateEngine {

    private static bool _initialized;


    public static void Initialize() {
        if (!_initialized) {
            Template.RegisterFilter(typeof(Filters));
            _initialized = true;
        }
    }


    private class Filters {

        public static string Filename(string value) {
            return Path.GetFileName(value);
        }


        public static string EncodeUri(string value) {
            return Uri.EscapeUriString(value);
        }


        public static string EncodeUriComponent(string value) {
            return Uri.EscapeDataString(value);
        }


        public static string EncodeUriComponentSegments(string value) {
            return string.Join("/", value.Split('/').Select(Uri.EscapeDataString));
        }


        public static string DecodeUri(string value) {
            return Uri.UnescapeDataString(value);
        }


        public static string DecodeUriComponent(string value) {
            return Uri.UnescapeDataString(value);
        }


        public static string DecodeUriComponentSegments(string value) {
            return string.Join("/", value.Split('/').Select(Uri.UnescapeDataString));
        }
    }

}
