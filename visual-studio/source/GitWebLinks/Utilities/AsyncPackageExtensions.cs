#nullable enable

using Microsoft.VisualStudio.Shell;
using System;
using System.Threading.Tasks;

namespace GitWebLinks;

public static class AsyncPackageExtensions {

    public static Task<T> GetDialogPageAsync<T>(this AsyncPackage package) where T : DialogPage {
        return package.GetDialogPageAsync<T>(typeof(T));
    }


    public static async Task<T> GetDialogPageAsync<T>(this AsyncPackage package, Type dialogPageType) where T : DialogPage {
        await package.JoinableTaskFactory.SwitchToMainThreadAsync();
        return (T)package.GetDialogPage(dialogPageType);
    }

}
