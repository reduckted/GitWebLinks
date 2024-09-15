#nullable enable

using DotLiquid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class DynamicServer : IServer {

    public DynamicServer(Regex remotePattern, Template http, Template ssh, Regex? webPattern, Template? web) {
        RemotePattern = remotePattern;
        Http = http;
        Ssh = ssh;
        WebPattern = webPattern;
        Web = web;
    }


    public Regex RemotePattern { get; }


    public Template Http { get; }


    public Template Ssh { get; }


    public Regex? WebPattern { get; }


    public Template? Web { get; }

}
