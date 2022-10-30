#nullable enable

using Microsoft.VisualStudio;
using System;
using System.Diagnostics;
using System.Windows;

namespace GitWebLinks;

public static class FocusOnLoad {

    public static readonly DependencyProperty TargetProperty = DependencyProperty.RegisterAttached(
        "Target",
        typeof(UIElement),
        typeof(FocusOnLoad),
        new PropertyMetadata(null, OnTargetChanged)
    );


    public static UIElement? GetTarget(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (UIElement)obj.GetValue(TargetProperty);
    }


    public static void SetTarget(DependencyObject obj, UIElement? value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(TargetProperty, value);
    }


    private static void OnTargetChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is FrameworkElement source) {
            if (e.OldValue is not null) {
                source.Loaded -= OnLoaded;
            }

            if (e.NewValue is UIElement target) {
                source.Loaded += OnLoaded;
            }
        }
    }

    private static void OnLoaded(object sender, RoutedEventArgs e) {
        try {
            if (sender is FrameworkElement source) {
                GetTarget(source)?.Focus();
            }

        } catch (Exception ex) when (!ErrorHandler.IsCriticalException(ex)) {
            Debug.WriteLine(ex);
        }
    }

}
