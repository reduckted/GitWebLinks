#nullable enable

using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;

namespace GitWebLinks;

public static class ClearOnEscape {

    public static readonly DependencyProperty EnabledProperty = DependencyProperty.RegisterAttached(
        "Enabled",
        typeof(bool),
        typeof(ClearOnEscape),
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
        if (d is TextBox box) {
            if ((bool)e.OldValue) {
                box.KeyDown -= OnKeyDown;
            }

            if ((bool)e.NewValue) {
                box.KeyDown += OnKeyDown;
            }
        }
    }


    private static void OnKeyDown(object sender, KeyEventArgs e) {
        if (e.OriginalSource == sender) {
            if (e.Key == Key.Escape) {
                if (sender is TextBox box) {
                    if (!string.IsNullOrEmpty(box.Text)) {
                        box.Text = "";
                        e.Handled = true;
                    }
                }
            }
        }
    }

}
