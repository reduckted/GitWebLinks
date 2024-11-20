#nullable enable

using Fluid;

namespace GitWebLinks;

public class ReverseSelectionSettings {

    public ReverseSelectionSettings(
        IFluidTemplate startLine,
        IFluidTemplate? startColumn,
        IFluidTemplate? endLine,
        IFluidTemplate? endColumn
    ) {
        StartLine = startLine;
        StartColumn = startColumn;
        EndLine = endLine;
        EndColumn = endColumn;
    }


    public IFluidTemplate StartLine { get; }


    public IFluidTemplate? StartColumn { get; }


    public IFluidTemplate? EndLine { get; }


    public IFluidTemplate? EndColumn { get; }

}
