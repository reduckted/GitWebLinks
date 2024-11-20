#nullable enable

using Fluid;

namespace GitWebLinks;

public class ReverseServerSettings {

    public ReverseServerSettings(IFluidTemplate http, IFluidTemplate ssh, IFluidTemplate? web) {
        Http = http;
        Ssh = ssh;
        Web = web;
    }


    public IFluidTemplate Http { get; }


    public IFluidTemplate Ssh { get; }


    public IFluidTemplate? Web { get; }

}
