#nullable enable

namespace GitWebLinks;

public class StaticServer : IServer {

    public StaticServer(string http, string? ssh, string? web) {
        Http = http;
        Ssh = ssh;
        Web = web;
    }


    public string Http { get; }


    public string? Ssh { get; }


    public string? Web { get; }

}
