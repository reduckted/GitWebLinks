#nullable enable

namespace GitWebLinks;

public interface IClipboard {

    string? GetText();


    void SetText(string value);

}
