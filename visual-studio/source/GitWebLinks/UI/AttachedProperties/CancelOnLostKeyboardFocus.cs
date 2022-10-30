#nullable enable

using System;
using System.Windows;

namespace GitWebLinks;

public static class CancelOnLostKeyboardFocus {

    public static readonly DependencyProperty EnabledProperty = DependencyProperty.RegisterAttached(
        "Enabled",
        typeof(bool),
        typeof(CancelOnLostKeyboardFocus),
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
                window.IsKeyboardFocusWithinChanged -= OnIsKeyboardFocusWithinChanged;
            }

            if ((bool)e.NewValue) {
                window.IsKeyboardFocusWithinChanged += OnIsKeyboardFocusWithinChanged;
            }
        }
    }


    private static void OnIsKeyboardFocusWithinChanged(object sender, DependencyPropertyChangedEventArgs e) {
        if (e.NewValue is bool value && !value) {
            if (sender is Window window) {
                window.DialogResult ??= false;
            }
        }
    }

}
