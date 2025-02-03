#nullable enable

using System.Text;

namespace GitWebLinks;

public class PartialSelectedRange {

    public PartialSelectedRange(int? startLine, int? startColumn, int? endLine, int? endColumn) {
        StartLine = startLine;
        StartColumn = startColumn;
        EndLine = endLine;
        EndColumn = endColumn;
    }


    public int? StartLine { get; }


    public int? StartColumn { get; }


    public int? EndLine { get; }


    public int? EndColumn { get; }


    public override string ToString() {
        StringBuilder builder;
        bool empty;

        builder = new StringBuilder();
        empty = true;

        builder.Append('{');

        if (StartLine.HasValue) {
            builder.Append($"StartLine = {StartLine}");
            empty = false;
        }

        if (StartColumn.HasValue) {
            Separate(builder, empty);
            builder.Append($"StartColumn = {StartColumn}");
            empty = false;
        }

        if (EndLine.HasValue) {
            Separate(builder, empty);
            builder.Append($"EndLine = {EndLine}");
            empty = false;
        }

        if (EndColumn.HasValue) {
            Separate(builder, empty);
            builder.Append($"EndColumn = {EndColumn}");
        }

        builder.Append('}');

        return builder.ToString();

        static void Separate(StringBuilder builder, bool empty) {
            if (!empty) {
                builder.Append(", ");
            }
        }
    }

}
