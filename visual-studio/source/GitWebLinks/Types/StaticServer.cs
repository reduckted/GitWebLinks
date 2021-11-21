#nullable enable

namespace GitWebLinks;

public class StaticServer : IServer {

    public StaticServer(string http, string? ssh) {
        Http = http;
        Ssh = ssh;
    }


    public string Http { get; }


    public string? Ssh { get; }

}
