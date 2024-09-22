#nullable enable

using DotLiquid;

namespace GitWebLinks;

public class ReverseServerSettings {

    public ReverseServerSettings(Template http, Template ssh, Template? web) {
        Http = http;
        Ssh = ssh;
        Web = web;
    }


    public Template Http { get; }


    public Template Ssh { get; }


    public Template? Web { get; }

}
