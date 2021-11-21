#nullable enable

using System.Globalization;

namespace GitWebLinks;

public static class ResourceHelpers {

    public static string Format(this string text, object? arg0) {
        return string.Format(CultureInfo.CurrentCulture, text, arg0);
    }


    public static string Format(this string text, object? arg0, object? arg1) {
        return string.Format(CultureInfo.CurrentCulture, text, arg0, arg1);
    }


    public static string Format(this string text, params object?[] args) {
        return string.Format(CultureInfo.CurrentCulture, text, args);
    }

}
