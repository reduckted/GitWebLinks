#nullable enable

using DotLiquid;

namespace GitWebLinks;

public class ReverseSelectionSettings {

    public ReverseSelectionSettings(Template startLine, Template? startColumn, Template? endLine, Template? endColumn) {
        StartLine = startLine;
        StartColumn = startColumn;
        EndLine = endLine;
        EndColumn = endColumn;
    }


    public Template StartLine { get; }


    public Template? StartColumn { get; }


    public Template? EndLine { get; }


    public Template? EndColumn { get; }

}
