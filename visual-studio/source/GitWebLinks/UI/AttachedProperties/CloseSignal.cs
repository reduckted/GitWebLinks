#nullable enable

using System;
using System.Windows;

namespace GitWebLinks;

public static class CloseSignal {

    public static readonly DependencyProperty CloseProperty = DependencyProperty.RegisterAttached(
        "Close",
        typeof(bool),
        typeof(CloseSignal),
        new PropertyMetadata(false, OnCloseChanged)
    );


    public static bool GetClose(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (bool)obj.GetValue(CloseProperty);
    }


    public static void SetClose(DependencyObject obj, bool value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(CloseProperty, value);
    }


    private static void OnCloseChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is Window window) {
            if (e.NewValue is bool close && close) {
                window.Close();
            }
        }
    }

}
