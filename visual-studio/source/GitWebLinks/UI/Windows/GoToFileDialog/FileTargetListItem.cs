#nullable enable

using Microsoft.VisualStudio.Imaging.Interop;
using System.IO;

namespace GitWebLinks;

public class FileTargetListItem {

    public FileTargetListItem(FileTarget file, string relativePath, ImageMoniker icon) {
        File = file;
        RelativePath = relativePath;
        Icon = icon;
        Name = Path.GetFileName(file.FileName);
    }


    public FileTarget File { get; }


    public string RelativePath { get; }


    public string Name { get; }


    public ImageMoniker Icon { get; }

}
