#nullable enable

using Fluid;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public class DynamicServer : IServer {

    public DynamicServer(
        Regex remotePattern,
        IFluidTemplate http,
        IFluidTemplate ssh,
        Regex? webPattern,
        IFluidTemplate? web
    ) {
        RemotePattern = remotePattern;
        Http = http;
        Ssh = ssh;
        WebPattern = webPattern;
        Web = web;
    }


    public Regex RemotePattern { get; }


    public IFluidTemplate Http { get; }


    public IFluidTemplate Ssh { get; }


    public Regex? WebPattern { get; }


    public IFluidTemplate? Web { get; }

}
