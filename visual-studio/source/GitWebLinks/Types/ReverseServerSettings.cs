#nullable enable

using DotLiquid;

namespace GitWebLinks;

public class ReverseServerSettings {

    public ReverseServerSettings(Template http, Template ssh) {
        Http = http;
        Ssh = ssh;
    }


    public Template Http { get; }


    public Template Ssh { get; }

}
