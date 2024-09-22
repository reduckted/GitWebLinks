#nullable enable

using System.Collections.Generic;

namespace GitWebLinks;

partial class DefinitionProvider {

    private class JsonHandlerDefinition {

        public string Name { get; set; } = "";


        public IReadOnlyList<JsonServer>? Server { get; set; }


        public string? Private { get; set; }


        public BranchRefType BranchRef { get; set; }


        public IReadOnlyList<string>? SettingsKeys { get; set; }


        public string Url { get; set; } = "";


        public IReadOnlyList<JsonQueryModification>? Query { get; set; }


        public string Selection { get; set; } = "";


        public JsonReverseSettings Reverse { get; set; } = default!;

    }


    private class JsonServer {

        public string? RemotePattern { get; set; }


        public string Http { get; set; } = "";


        public string Ssh { get; set; } = "";


        public string? WebPattern { get; set; }


        public string? Web { get; set; }

    }


    private class JsonQueryModification {

        public string Pattern { get; set; } = "";


        public string Key { get; set; } = "";


        public string Value { get; set; } = "";

    }


    private class JsonReverseSettings {

        public string Pattern { get; set; } = "";


        public string File { get; set; } = "";


        public bool FileMayStartWithBranch { get; set; }


        public JsonReverseServerSettings Server { get; set; } = default!;


        public JsonReverseSelectionSettings Selection { get; set; } = default!;

    }


    private class JsonReverseServerSettings {

        public string Http { get; set; } = "";


        public string Ssh { get; set; } = "";


        public string? Web { get; set; }

    }


    private class JsonReverseSelectionSettings {

        public string StartLine { get; set; } = "";


        public string? StartColumn { get; set; }


        public string? EndLine { get; set; }


        public string? EndColumn { get; set; }

    }

}
