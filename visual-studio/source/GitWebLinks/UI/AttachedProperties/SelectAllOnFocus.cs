#nullable enable

using System;
using System.Windows;
using System.Windows.Controls.Primitives;

namespace GitWebLinks;

public static class SelectAllOnFocus {

    public static readonly DependencyProperty EnabledProperty = DependencyProperty.RegisterAttached(
        "Enabled",
        typeof(bool),
        typeof(SelectAllOnFocus),
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
        if (d is TextBoxBase box) {
            if ((bool)e.OldValue) {
                box.GotFocus -= OnGotFocus;
            }

            if ((bool)e.NewValue) {
                box.GotFocus += OnGotFocus;

                if (box.IsKeyboardFocused) {
                    box.SelectAll();
                }
            }
        }
    }


    private static void OnGotFocus(object sender, RoutedEventArgs e) {
        if (sender is TextBoxBase box) {
            box.SelectAll();
        }
    }

}
