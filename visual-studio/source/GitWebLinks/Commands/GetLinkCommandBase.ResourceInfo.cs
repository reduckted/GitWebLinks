#nullable enable

namespace GitWebLinks;

partial class GetLinkCommandBase<T> {

    private class ResourceInfo {

        public ResourceInfo(string filePath, Repository repository, LinkHandler handler) {
            FilePath = filePath;
            Repository = repository;
            Handler = handler;
        }


        public string FilePath { get; }


        public Repository Repository { get; }


        public LinkHandler Handler { get; }

    }

}
