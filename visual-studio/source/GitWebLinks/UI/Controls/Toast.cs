#nullable enable

using System.Windows;
using System.Windows.Controls;

namespace GitWebLinks;

public class Toast : ContentControl {

    public static readonly DependencyProperty MessageProperty = DependencyProperty.Register(
        nameof(Message),
        typeof(string),
        typeof(Toast),
        new PropertyMetadata("")
    );


    public static readonly DependencyProperty CanCopyRawProperty = DependencyProperty.Register(
        nameof(CanCopyRaw),
        typeof(bool),
        typeof(Toast),
        new PropertyMetadata(false)
    );


    public static readonly DependencyProperty CanCopyMarkdownProperty = DependencyProperty.Register(
        nameof(CanCopyMarkdown),
        typeof(bool),
        typeof(Toast),
        new PropertyMetadata(false)
    );


    public static readonly DependencyProperty CanCopyMarkdownWithPreviewProperty = DependencyProperty.Register(
        nameof(CanCopyMarkdownWithPreview),
        typeof(bool),
        typeof(Toast),
        new PropertyMetadata(false)
    );


    public static readonly RoutedEvent CloseEvent = EventManager.RegisterRoutedEvent(
        nameof(Close),
        RoutingStrategy.Bubble,
        typeof(RoutedEventHandler),
        typeof(Toast)
    );


    public static readonly RoutedEvent OpenInBrowserEvent = EventManager.RegisterRoutedEvent(
        nameof(OpenInBrowserEvent),
        RoutingStrategy.Bubble,
        typeof(RoutedEventHandler),
        typeof(Toast)
    );


    public static readonly RoutedEvent CopyRawEvent = EventManager.RegisterRoutedEvent(
        nameof(CopyRaw),
        RoutingStrategy.Bubble,
        typeof(RoutedEventHandler),
        typeof(Toast)
    );


    public static readonly RoutedEvent CopyMarkdownEvent = EventManager.RegisterRoutedEvent(
        nameof(CopyMarkdown),
        RoutingStrategy.Bubble,
        typeof(RoutedEventHandler),
        typeof(Toast)
    );


    public static readonly RoutedEvent CopyMarkdownWithPreviewEvent = EventManager.RegisterRoutedEvent(
        nameof(CopyMarkdownWithPreview),
        RoutingStrategy.Bubble,
        typeof(RoutedEventHandler),
        typeof(Toast)
    );


    private Button? _closeButton;
    private Button? _openInBrowserButton;
    private Button? _copyRawButton;
    private Button? _copyMarkdownButton;
    private Button? _copyMarkdownWithPreviewButton;


    static Toast() {
        DefaultStyleKeyProperty.OverrideMetadata(
            typeof(Toast),
            new FrameworkPropertyMetadata(typeof(Toast))
        );
    }


    public string Message {
        get => (string)GetValue(MessageProperty);
        set => SetValue(MessageProperty, value);
    }


    public bool CanCopyRaw {
        get => (bool)GetValue(CanCopyRawProperty);
        set => SetValue(CanCopyRawProperty, value);
    }


    public bool CanCopyMarkdown {
        get => (bool)GetValue(CanCopyMarkdownProperty);
        set => SetValue(CanCopyMarkdownProperty, value);
    }


    public bool CanCopyMarkdownWithPreview {
        get => (bool)GetValue(CanCopyMarkdownWithPreviewProperty);
        set => SetValue(CanCopyMarkdownWithPreviewProperty, value);
    }


    public event RoutedEventHandler Close {
        add => AddHandler(CloseEvent, value);
        remove => RemoveHandler(CloseEvent, value);
    }


    public event RoutedEventHandler OpenInBrowser {
        add => AddHandler(OpenInBrowserEvent, value);
        remove => RemoveHandler(OpenInBrowserEvent, value);
    }


    public event RoutedEventHandler CopyRaw {
        add => AddHandler(CopyRawEvent, value);
        remove => RemoveHandler(CopyRawEvent, value);
    }


    public event RoutedEventHandler CopyMarkdown {
        add => AddHandler(CopyMarkdownEvent, value);
        remove => RemoveHandler(CopyMarkdownEvent, value);
    }


    public event RoutedEventHandler CopyMarkdownWithPreview {
        add => AddHandler(CopyMarkdownWithPreviewEvent, value);
        remove => RemoveHandler(CopyMarkdownWithPreviewEvent, value);
    }


    public override void OnApplyTemplate() {
        if (_closeButton is not null) {
            _closeButton.Click -= OnCloseClick;
        }

        if (_openInBrowserButton is not null) {
            _openInBrowserButton.Click -= OnOpenInBrowserClick;
        }

        if (_copyRawButton is not null) {
            _copyRawButton.Click -= OnCopyRawClick;
        }

        if (_copyMarkdownButton is not null) {
            _copyMarkdownButton.Click -= OnCopyMarkdownClick;
        }

        if (_copyMarkdownWithPreviewButton is not null) {
            _copyMarkdownWithPreviewButton.Click -= OnCopyMarkdownWithPreviewClick;
        }

        base.OnApplyTemplate();

        _closeButton = GetTemplateChild("PART_Close") as Button;
        _openInBrowserButton = GetTemplateChild("PART_OpenInBrowser") as Button;
        _copyRawButton = GetTemplateChild("PART_CopyRaw") as Button;
        _copyMarkdownButton = GetTemplateChild("PART_CopyMarkdown") as Button;
        _copyMarkdownWithPreviewButton = GetTemplateChild("PART_CopyMarkdownWithPreview") as Button;

        if (_closeButton is not null) {
            _closeButton.Click += OnCloseClick;
        }

        if (_openInBrowserButton is not null) {
            _openInBrowserButton.Click += OnOpenInBrowserClick;
        }

        if (_copyRawButton is not null) {
            _copyRawButton.Click += OnCopyRawClick;
        }

        if (_copyMarkdownButton is not null) {
            _copyMarkdownButton.Click += OnCopyMarkdownClick;
        }

        if (_copyMarkdownWithPreviewButton is not null) {
            _copyMarkdownWithPreviewButton.Click += OnCopyMarkdownWithPreviewClick;
        }
    }


    private void OnCloseClick(object sender, RoutedEventArgs e) {
        RaiseEvent(new RoutedEventArgs(CloseEvent, this));
    }


    private void OnOpenInBrowserClick(object sender, RoutedEventArgs e) {
        RaiseEvent(new RoutedEventArgs(OpenInBrowserEvent, this));
    }


    private void OnCopyRawClick(object sender, RoutedEventArgs e) {
        RaiseEvent(new RoutedEventArgs(CopyRawEvent, this));
    }


    private void OnCopyMarkdownClick(object sender, RoutedEventArgs e) {
        RaiseEvent(new RoutedEventArgs(CopyMarkdownEvent, this));
    }


    private void OnCopyMarkdownWithPreviewClick(object sender, RoutedEventArgs e) {
        RaiseEvent(new RoutedEventArgs(CopyMarkdownWithPreviewEvent, this));
    }

}
