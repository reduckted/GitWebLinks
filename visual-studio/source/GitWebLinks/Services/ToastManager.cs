#nullable enable

using Microsoft.VisualStudio.Shell;
using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace GitWebLinks;

public class ToastManager {

    private readonly ILogger _logger;
    private readonly Lazy<Grid?> _rootGrid;
    private (Toast Toast, DispatcherTimer Timer)? _current;


    public ToastManager(ILogger logger) {
        _logger = logger;

        _rootGrid = new Lazy<Grid?>(FindRootGrid, false);
    }


    public void Show(Toast toast) {
        DispatcherTimer timer;
        Grid? root;


        root = _rootGrid.Value;

        if (root is null) {
            return;
        }

        if (_current is not null) {
            _current.Value.Timer.Stop();
            root.Children.Remove(_current.Value.Toast);
            _current = null;
        }

        timer = new DispatcherTimer {
            Interval = TimeSpan.FromSeconds(10_000)
        };

        timer.Tick += (s, e) => {
            timer.Stop();
            root.Children.Remove(toast);
            _current = null;
        };

        // Make the toast control cover all grid cells,
        // and align it to the bottom right corner.
        Grid.SetColumn(toast, 0);
        Grid.SetRow(toast, 0);
        Grid.SetColumnSpan(toast, int.MaxValue);
        Grid.SetRowSpan(toast, int.MaxValue);
        toast.HorizontalAlignment = HorizontalAlignment.Right;
        toast.VerticalAlignment = VerticalAlignment.Bottom;
        toast.Margin = new Thickness(0, 0, 15, 40);

        root.Children.Add(toast);
        _current = (toast, timer);
        timer.Start();
    }


    public void Close(Toast toast) {
        if (_current is not null) {
            Grid? root;


            root = _rootGrid.Value;

            if (root is not null) {
                if (_current.Value.Toast == toast) {
                    _current.Value.Timer.Stop();
                    root.Children.Remove(_current.Value.Toast);
                    _current = null;
                }
            }
        }
    }


    private Grid? FindRootGrid() {
        Grid? grid;


        grid = FindRootGridFrom(Application.Current.MainWindow);

        if (grid is null) {
            _logger.LogAsync("Could not find the root grid for the toast notification.").FireAndForget();
        }

        return grid;
    }


    private static Grid? FindRootGridFrom(DependencyObject from) {
        int childrenCount;


        childrenCount = VisualTreeHelper.GetChildrenCount(from);

        for (int i = 0; i < childrenCount; i++) {
            DependencyObject child;
            Grid? grid;


            child = VisualTreeHelper.GetChild(from, i);
            grid = child as Grid;

            if (grid is not null && string.Equals(grid.Name, "RootGrid")) {
                return grid;
            }

            grid = FindRootGridFrom(child);

            if (grid is not null) {
                return grid;
            }
        }

        return null;
    }

}
