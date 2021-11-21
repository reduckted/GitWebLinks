#nullable enable

using Microsoft.VisualStudio.Shell;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Windows;

namespace GitWebLinks;

[ComVisible(true)]
[DesignerCategory("Code")]
public abstract class OptionsPageBase : UIElementDialogPage, INotifyPropertyChanged {

    private FrameworkElement? _view;


    protected override sealed UIElement Child {
        get {
            if (_view is null) {
                _view = CreateView();
                _view.DataContext = this;
            }

            return _view;
        }
    }


    protected abstract FrameworkElement CreateView();


    protected void SetProperty<T>(ref T field, T value, [CallerMemberName] string propertyName = "") {
        field = value;
        OnPropertyChanged(propertyName);
    }


    protected virtual void OnPropertyChanged(string propertyName) {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }


    public event PropertyChangedEventHandler? PropertyChanged;

}
