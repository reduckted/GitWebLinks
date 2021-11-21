#nullable enable

namespace GitWebLinks;

public class FileInfo {

    public FileInfo(string filePath, SelectedRange? selection) {
        FilePath = filePath;
        Selection = selection;
    }


    public string FilePath { get; }


    public SelectedRange? Selection { get; }

}
