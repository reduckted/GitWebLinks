#nullable enable

namespace GitWebLinks;

partial class GetLinkCommandBase<T> {

    private class ResourceInfo {

        public ResourceInfo(string filePath, Repository repository, ILinkHandler handler, string remoteUrl) {
            FilePath = filePath;
            Repository = repository;
            Handler = handler;
            RemoteUrl = remoteUrl;
        }


        public string FilePath { get; }


        public Repository Repository { get; }


        public ILinkHandler Handler { get; }


        public string RemoteUrl { get; }

    }

}
