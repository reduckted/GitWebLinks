#nullable enable

namespace GitWebLinks;

public class LinkFormatListItem {

    public LinkFormatListItem(LinkFormat value) {
        Value = value;

        Name = value switch {
            LinkFormat.Raw => "Raw URL",
            LinkFormat.Markdown=> "Markdown Link",
            LinkFormat.MarkdownWithPreview=> "Markdown Link with Code Block",
            _ => "?"
        };
    }


    public string Name { get; }


    public LinkFormat Value { get; }

}
