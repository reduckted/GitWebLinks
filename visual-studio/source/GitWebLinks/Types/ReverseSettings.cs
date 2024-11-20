#nullable enable

using Fluid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class ReverseSettings {

    public ReverseSettings(
        Regex pattern,
        IFluidTemplate file,
        bool fileMayStartWithBranch,
        ReverseServerSettings server,
        ReverseSelectionSettings selection
    ) {
        Pattern = pattern;
        File = file;
        FileMayStartWithBranch = fileMayStartWithBranch;
        Server = server;
        Selection = selection;
    }


    public Regex Pattern { get; }


    public IFluidTemplate File { get; }


    public bool FileMayStartWithBranch { get; }


    public ReverseServerSettings Server { get; }


    public ReverseSelectionSettings Selection { get; }

}
