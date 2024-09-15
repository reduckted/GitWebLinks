#nullable enable

using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;

namespace GitWebLinks;

public class ServerDataGrid : ItemsControl {

    private DataGrid? _dataGrid;


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


    public static readonly DependencyProperty WebExampleProperty = DependencyProperty.Register(
        nameof(WebExample),
        typeof(string),
        typeof(ServerDataGrid),
        new FrameworkPropertyMetadata("")
    );


    public static readonly DependencyProperty HasWebAddressProperty = DependencyProperty.Register(
        nameof(HasWebAddress),
        typeof(bool),
        typeof(ServerDataGrid),
        new FrameworkPropertyMetadata(false, OnHasWebAddressChanged)
    );


    private static readonly DependencyPropertyKey WebExampleVisibilityPropertyKey = DependencyProperty.RegisterReadOnly(
        nameof(WebExampleVisibility),
        typeof(Visibility),
        typeof(ServerDataGrid),
        new FrameworkPropertyMetadata(Visibility.Collapsed)
    );


    public static readonly DependencyProperty WebExampleVisibilityProperty = WebExampleVisibilityPropertyKey.DependencyProperty;


    public string HttpExample {
        get { return (string)GetValue(HttpExampleProperty); }
        set { SetValue(HttpExampleProperty, value); }
    }


    public string SshExample {
        get { return (string)GetValue(SshExampleProperty); }
        set { SetValue(SshExampleProperty, value); }
    }


    public string WebExample {
        get { return (string)GetValue(WebExampleProperty); }
        set { SetValue(WebExampleProperty, value); }
    }


    public bool HasWebAddress {
        get { return (bool)GetValue(HasWebAddressProperty); }
        set { SetValue(HasWebAddressProperty, value); }
    }


    public bool WebExampleVisibility {
        get { return (bool)GetValue(WebExampleVisibilityProperty); }
    }


    private static void OnHasWebAddressChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        d.SetValue(
            WebExampleVisibilityPropertyKey,
            (bool)e.NewValue ? Visibility.Visible : Visibility.Collapsed
        );

        (d as ServerDataGrid)?.ApplyColumns();
    }


    public override void OnApplyTemplate() {
        base.OnApplyTemplate();

        _dataGrid = GetTemplateChild("PART_DataGrid") as DataGrid;
        ApplyColumns();
    }

    private void ApplyColumns() {
        if (_dataGrid is not null) {
            _dataGrid.Columns.Clear();

            _dataGrid.Columns.Add(
                new DataGridTextColumn {
                    Width = new DataGridLength(1, DataGridLengthUnitType.Star),
                    Header = "HTTP URL",
                    Binding = new Binding(nameof(ServerListItem.Http)) {
                        UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged
                    }
                }
            );

            _dataGrid.Columns.Add(
                new DataGridTextColumn {
                    Width = new DataGridLength(1, DataGridLengthUnitType.Star),
                    Header = "SSH URL",
                    Binding = new Binding(nameof(ServerListItem.Ssh)) {
                        UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged
                    }
                }
            );

            if (HasWebAddress) {
                _dataGrid.Columns.Add(
                    new DataGridTextColumn {
                        Width = new DataGridLength(1, DataGridLengthUnitType.Star),
                        Header = "Web URL",
                        Binding = new Binding(nameof(ServerListItem.Web)) {
                            UpdateSourceTrigger = UpdateSourceTrigger.PropertyChanged
                        }
                    }
                );
            }
        }
    }

}
