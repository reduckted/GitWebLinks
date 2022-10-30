#nullable enable

namespace GitWebLinks;

partial class GetLinkCommandBase<T> {

    private class ResourceInfo {

        public ResourceInfo(string filePath, Repository repository, ILinkHandler handler) {
            FilePath = filePath;
            Repository = repository;
            Handler = handler;
        }


        public string FilePath { get; }


        public Repository Repository { get; }


        public ILinkHandler Handler { get; }

    }

}
