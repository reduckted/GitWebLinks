#nullable enable

using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Selector = System.Windows.Controls.Primitives.Selector;

namespace GitWebLinks;

public class ListNavigation {

    private enum SelectionChangeKind {
        Previous,
        Next
    }


    public static readonly DependencyProperty CircularProperty = DependencyProperty.RegisterAttached(
        "Circular",
        typeof(bool),
        typeof(ListNavigation),
        new PropertyMetadata(false, OnCircularChanged)
    );


    public static readonly DependencyProperty ListProperty = DependencyProperty.RegisterAttached(
        "List",
        typeof(Selector),
        typeof(ListNavigation),
        new PropertyMetadata(null, OnListChanged)
    );


    public static bool GetCircular(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (bool)obj.GetValue(CircularProperty);
    }


    public static void SetCircular(DependencyObject obj, bool value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(CircularProperty, value);
    }


    private static void OnCircularChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is Selector selector) {
            if ((bool)e.OldValue) {
                selector.PreviewKeyDown -= OnSelectorPreviewKeyDown;
            }

            if ((bool)e.NewValue) {
                selector.PreviewKeyDown += OnSelectorPreviewKeyDown;
            }
        }
    }


    private static void OnSelectorPreviewKeyDown(object sender, KeyEventArgs e) {
        if (sender is Selector selector) {
            switch (e.Key) {
                case Key.Up:
                    if ((selector.SelectedIndex == 0) && (selector.Items.Count > 0)) {
                        selector.RaiseEvent(CreateKeyDownEvent(e, Key.End));
                        e.Handled = true;
                    }
                    break;

                case Key.Down:
                    if ((selector.SelectedIndex == (selector.Items.Count - 1)) && (selector.Items.Count > 0)) {
                        selector.RaiseEvent(CreateKeyDownEvent(e, Key.Home));
                        e.Handled = true;
                    }
                    break;
            }
        }
    }


    private static KeyEventArgs CreateKeyDownEvent(KeyEventArgs baseEvent, Key key) {
        return new KeyEventArgs(baseEvent.KeyboardDevice, baseEvent.InputSource, baseEvent.Timestamp, key) {
            RoutedEvent = UIElement.KeyDownEvent
        };
    }


    public static Selector? GetList(DependencyObject obj) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        return (Selector?)obj.GetValue(ListProperty);
    }


    public static void SetList(DependencyObject obj, Selector? value) {
        if (obj is null) {
            throw new ArgumentNullException(nameof(obj));
        }

        obj.SetValue(ListProperty, value);
    }


    private static void OnListChanged(DependencyObject d, DependencyPropertyChangedEventArgs e) {
        if (d is UIElement element) {
            if (e.OldValue is not null) {
                element.PreviewKeyDown -= OnElementPreviewKeyDown;
            }

            if (e.NewValue is not null) {
                element.PreviewKeyDown += OnElementPreviewKeyDown;
            }
        }
    }


    private static void OnElementPreviewKeyDown(object sender, KeyEventArgs e) {
        if (sender is UIElement element) {
            switch (e.Key) {
                case Key.Up:
                    SelectItem(GetList(element), SelectionChangeKind.Previous);
                    e.Handled = true;
                    break;

                case Key.Down:
                    SelectItem(GetList(element), SelectionChangeKind.Next);
                    e.Handled = true;
                    break;

            }
        }
    }


    private static void SelectItem(Selector? selector, SelectionChangeKind change) {
        if (selector is not null) {
            int count;

            count = selector.Items.Count;

            if (count > 0) {
                switch (change) {
                    case SelectionChangeKind.Previous:
                        selector.SelectedIndex = (selector.SelectedIndex - 1 + count) % count;
                        break;

                    case SelectionChangeKind.Next:
                        selector.SelectedIndex = (selector.SelectedIndex + 1 + count) % count;
                        break;
                }

                if (selector.SelectedItem is not null) {
                    if (selector.ItemContainerGenerator.ContainerFromItem(selector.SelectedItem) is ListBoxItem item) {
                        item.BringIntoView();
                    }
                }
            }
        }
    }

}
