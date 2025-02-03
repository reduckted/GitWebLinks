#nullable enable

namespace GitWebLinks;

public class SelectedRange {

    public SelectedRange(int startLine, int startColumn, int endLine, int endColumn) {
        StartLine = startLine;
        StartColumn = startColumn;
        EndLine = endLine;
        EndColumn = endColumn;
    }


    public int StartLine { get; }


    public int StartColumn { get; }


    public int EndLine { get; }


    public int EndColumn { get; }


    public override string ToString() {
        return $"{StartLine}:{StartColumn}-{EndLine}:{EndColumn}";
    }
}

