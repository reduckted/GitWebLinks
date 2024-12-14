using System.Runtime.ExceptionServices;

namespace GitWebLinks;

public abstract class DirectoryTestBase : IDisposable {

    private readonly DirectoryInfo _rootDirectory;


    protected DirectoryTestBase() {
        _rootDirectory = Directory.CreateDirectory(Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("n")));
    }


    protected string RootDirectory => _rootDirectory.FullName;


    protected string CreateDirectory(string relativePath) {
        return _rootDirectory.CreateSubdirectory(relativePath).FullName;
    }


    protected string CreateFile(string relativeFileName) {
        string fullPath;


        fullPath = Path.Combine(RootDirectory, relativeFileName);
        using (File.Create(fullPath)) { }

        return fullPath;
    }


    protected virtual void Dispose(bool disposing) {
        ExceptionDispatchInfo? exception = null;

        for (int i = 0; i < 5; i++) {
            try {
                RemoveReadOnlyAttributes();
                _rootDirectory.Delete(true);
                return;

            } catch (IOException ex) {
                if (!_rootDirectory.Exists) {
                    // Somehow the directory has already
                    // been removed. Our job here is done.
                    return;
                }

                exception = ExceptionDispatchInfo.Capture(ex);

                // Something still has a lock on a file
                // in the directory. Wait a bit and try again.
                Thread.Sleep(1000);
            }
        }

        exception?.Throw();
    }


    private void RemoveReadOnlyAttributes() {
        foreach (System.IO.FileInfo file in _rootDirectory.EnumerateFiles("*", SearchOption.AllDirectories)) {
            if ((file.Attributes & FileAttributes.ReadOnly) != 0) {
                file.Attributes &= ~FileAttributes.ReadOnly;
            }
        }
    }


    public void Dispose() {
        Dispose(disposing: true);
        GC.SuppressFinalize(this);
    }

}
