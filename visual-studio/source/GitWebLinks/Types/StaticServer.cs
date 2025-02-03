#nullable enable

using System.Text;

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


    public override string ToString() {
        StringBuilder builder;

        builder = new StringBuilder();

        builder.Append('{');
        builder.Append($"Http = \"{Http}\"");

        if (Ssh is not null) {
            builder.Append($", Ssh = \"{Ssh}\"");
        }

        if (Web is not null) {
            builder.Append($", Web = \"{Web}\"");
        }

        builder.Append('}');

        return builder.ToString();
    }

}
