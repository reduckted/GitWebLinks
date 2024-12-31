#nullable enable

namespace GitWebLinks;

public class FileTarget {

    public FileTarget(string fileName, PartialSelectedRange selection) {
        FileName = fileName;
        Selection = selection;
    }


    public string FileName { get; }


    public PartialSelectedRange Selection { get; }

}
