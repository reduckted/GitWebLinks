#nullable enable

using System;
using System.Windows;
using System.Windows.Input;

namespace GitWebLinks;

public static class CancelOnEscape {

    public static readonly DependencyProperty EnabledProperty = DependencyProperty.RegisterAttached(
        "Enabled",
        typeof(bool),
        typeof(CancelOnEscape),
        new PropertyMetadata(false, OnEnabledChanged)
    );


    public static bool GetEnabled(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (bool)obj.GetValue(EnabledProperty);
    }


    public static void SetEnabled(DependencyObject obj, bool value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(EnabledProperty, value);
    }


    private static void OnEnabledChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is Window window) {
            if ((bool)e.OldValue) {
                window.KeyDown -= OnKeyDown;
            }

            if ((bool)e.NewValue) {
                window.KeyDown += OnKeyDown;
            }
        }
    }


    private static void OnKeyDown(object sender, KeyEventArgs e) {
        if (e.Key == Key.Escape) {
            if (sender is Window window) {
                window.DialogResult ??= false;
                e.Handled = true;
            }
        }
    }

}
