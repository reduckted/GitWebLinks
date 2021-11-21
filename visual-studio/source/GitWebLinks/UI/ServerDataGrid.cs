using System.Windows;
using System.Windows.Controls;

namespace GitWebLinks;

public class ServerDataGrid : ItemsControl {

    static ServerDataGrid() {
        DefaultStyleKeyProperty.OverrideMetadata(
            typeof(ServerDataGrid),
            new FrameworkPropertyMetadata(typeof(ServerDataGrid))
        );
    }


    public static readonly DependencyProperty HttpExampleProperty = DependencyProperty.Register(
        nameof(HttpExample),
        typeof(string),
        typeof(ServerDataGrid),
        new FrameworkPropertyMetadata("")
    );


    public static readonly DependencyProperty SshExampleProperty = DependencyProperty.Register(
        nameof(SshExample),
        typeof(string),
        typeof(ServerDataGrid),
        new FrameworkPropertyMetadata("")
    );


    public string HttpExample {
        get { return (string)GetValue(HttpExampleProperty); }
        set { SetValue(HttpExampleProperty, value); }
    }


    public string SshExample {
        get { return (string)GetValue(SshExampleProperty); }
        set { SetValue(SshExampleProperty, value); }
    }

}
