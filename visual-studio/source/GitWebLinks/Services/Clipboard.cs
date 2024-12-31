#nullable enable

using System.Windows;

namespace GitWebLinks;

public class Clipboard : IClipboard {

    public string? GetText() {
        return System.Windows.Clipboard.GetText(TextDataFormat.Text);
    }


    public void SetText(string value) {
        System.Windows.Clipboard.SetText(value, TextDataFormat.Text);
    }

}
