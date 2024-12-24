using Microsoft.VisualStudio.PlatformUI;
using Microsoft.VisualStudio.Shell;
using System.Windows;

namespace GitWebLinks;

public partial class SelectTargetDialog : DialogWindow {

    public SelectTargetDialog() {
        InitializeComponent();
    }


    private void OnLoaded(object sender, RoutedEventArgs args) {
        ((SelectTargetDialogViewModel)DataContext).OnLoadedAsync().FireAndForget();
    }

}
