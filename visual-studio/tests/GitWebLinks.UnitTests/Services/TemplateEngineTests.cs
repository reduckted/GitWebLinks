using DotLiquid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class TemplateEngineTests {

    static TemplateEngineTests() {
        TemplateEngine.Initialize();
    }


    [Fact]
    public void CanRenderBasicTemplate() {
        Assert.Equal(
            "Hello world!",
            Render("Hello {{ name }}!", Hash.FromAnonymousObject(new { name = "world" }))
        );
    }


    [Fact]
    public void CanRenderTemplateWithRegexMatches() {
        Assert.Equal(
            "Hello there, Bob!",
            Render(
                "Hello {{ match[1] }}, {{ match[2] }}!",
                TemplateData.Create().Add(Regex.Match("there once was a man named Bob", @"^(\w+)\s.+\s(\w+)$")).ToHash()
            )
        );
    }


    [Fact]
    public void CanRenderTemplateWithRegexGroups() {
        Assert.Equal(
            "Hello there, Bob!",
            Render(
                "Hello {{ match.groups.greeting }}, {{ match.groups.name }}!",
                TemplateData.Create().Add(Regex.Match("there once was a man named Bob", @"^(?<greeting>\w+)\s.+\s(?<name>\w+)$")).ToHash()
            )
        );
    }


    [Fact]
    public void EncodeUri() {
        Assert.Equal(
            "This%20+%20that",
            Render("This{{ \" + \" | encode_uri }}that")
        );
    }


    [Fact]
    public void EncodeUriComponent() {
        Assert.Equal(
            "This%20%2B%20that",
            Render("This{{ \" + \" | encode_uri_component }}that")
        );
    }


    [Fact]
    public void EncodeUriComponentSegments() {
        Assert.Equal(
            "This/a/b%23c/d/that",
            Render("This{{ \"/a/b#c/d/\" | encode_uri_component_segments }}that")
        );
    }


    [Fact]
    public void DecodeUri() {
        Assert.Equal(
            "This + that",
            Render("This{{ \"%20+%20\" | decode_uri }}that")
        );
    }


    [Fact]
    public void DecodeUriComponent() {
        Assert.Equal(
             "This + that",
             Render("This{{ \"%20%2B%20\" | decode_uri_component }}that")
         );
    }


    [Fact]
    public void DecodeUriComponentSegments() {
        Assert.Equal(
            "This/a/b#c/d/that",
            Render("This{{ \"/a/b%23c/d/\" | decode_uri_component_segments }}that")
        );
    }


    [Fact]
    public void Filename() {
        Assert.Equal(
            "The name is meep.ts.",
            Render("The name is {{ \"foo/bar/meep.ts\" | filename }}.")
        );
    }


    private static string Render(string template, Hash? hash = null) {
        return Template.Parse(template).Render(hash ?? Hash.FromAnonymousObject(new object()));
    }

}
