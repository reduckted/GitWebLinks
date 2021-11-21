#nullable enable

using DotLiquid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class DynamicServer : IServer {

    public DynamicServer(Regex pattern, Template http, Template ssh) {
        Pattern = pattern;
        Http = http;
        Ssh = ssh;
    }


    public Regex Pattern { get; }


    public Template Http { get; }


    public Template Ssh { get; }

}
