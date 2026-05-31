using GitWebLinks;

public class SelectedLinkHandler {

    public SelectedLinkHandler(ILinkHandler handler, string remoteUrl) {
        Handler = handler;
        RemoteUrl = remoteUrl;
    }


    public ILinkHandler Handler { get; }


    public string RemoteUrl { get; }
}
