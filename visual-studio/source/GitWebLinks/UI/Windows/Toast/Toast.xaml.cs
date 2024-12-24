#nullable enable

using System;
using System.Drawing;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Threading;

namespace GitWebLinks;

public partial class Toast : Window {

    private static Toast? _current;
    private readonly DispatcherTimer _timer;
    private readonly Window _mainWindow;



    public Toast() {
        _current?.Close();
        _current = this;

        _mainWindow = Application.Current.MainWindow;

        _timer = new DispatcherTimer() {
            Interval = TimeSpan.FromSeconds(10)
        };

        _timer.Tick += OnTimerTick;

        InitializeComponent();

        IsVisibleChanged += OnIsVisibleChanged;

        _mainWindow.StateChanged += OnMainWindowStateChanged;
        _mainWindow.LocationChanged += OnAnchorPositionChanged;
        _mainWindow.SizeChanged += OnAnchorPositionChanged;
        SizeChanged += OnAnchorPositionChanged;
    }


    private void OnTimerTick(object sender, EventArgs e) {
        _timer.Stop();
        Close();
    }


    private void OnMainWindowStateChanged(object sender, EventArgs e) {
        if (_mainWindow.WindowState == WindowState.Minimized) {
            // Hide this toast window when the main window is minimized.
            Visibility = Visibility.Collapsed;

        } else {
            Visibility = Visibility.Visible;
            SetPosition();
        }
    }


    private void OnAnchorPositionChanged(object sender, EventArgs e) {
        SetPosition();
    }



    private void OnIsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e) {
        // Start the timer when the window first becomes visible.
        if (e.NewValue is bool isVisible && isVisible) {
            // We only need to listen to the first change in
            // visibility, so we can remove the event handler now.
            IsVisibleChanged -= OnIsVisibleChanged;

            SetPosition();
            _timer.Start();
        }
    }


    protected override void OnClosed(EventArgs e) {
        _timer.Stop();

        IsVisibleChanged -= OnIsVisibleChanged;
        _mainWindow.StateChanged -= OnMainWindowStateChanged;
        _mainWindow.LocationChanged -= OnAnchorPositionChanged;
        _mainWindow.SizeChanged -= OnAnchorPositionChanged;
        SizeChanged -= OnAnchorPositionChanged;

        if (_current == this) {
            _current = null;
        }

        base.OnClosed(e);
    }


    private void SetPosition() {
        double right;
        double bottom;


        if (_mainWindow.WindowState == WindowState.Maximized) {
            Rectangle area;
            IntPtr hwnd;


            hwnd = new WindowInteropHelper(_mainWindow).Handle;
            area = System.Windows.Forms.Screen.FromHandle(hwnd).WorkingArea;

            bottom = area.Bottom;
            right = area.Right;

        } else {
            right = _mainWindow.Left + _mainWindow.ActualWidth;
            bottom = _mainWindow.Top + _mainWindow.ActualHeight;
        }

        Left = right - ActualWidth - 20;
        Top = bottom - ActualHeight - 45;
    }

}
