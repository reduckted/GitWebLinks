using System;
using System.Windows;

namespace GitWebLinks;

public static class DialogResult {

    public static readonly DependencyProperty ValueProperty = DependencyProperty.RegisterAttached(
        "Value",
        typeof(bool?),
        typeof(DialogResult),
        new PropertyMetadata(false, OnValueChanged)
    );


    public static bool? GetValue(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (bool?)obj.GetValue(ValueProperty);
    }


    public static void SetValue(DependencyObject obj, bool? value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(ValueProperty, value);
    }


    private static void OnValueChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is Window window) {
            window.DialogResult ??= ((bool?)e.NewValue);
        }
    }

}
