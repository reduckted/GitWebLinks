#nullable enable

using System;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class UrlHelpers {

    private static readonly Regex HttpPattern = new("(https?://)[^@]+@(.+)");


    public static string Normalize(string url) {
        Match httpMatch;


        // Remove the SSH prefix if it exists.
        if (url.StartsWith("ssh://", StringComparison.Ordinal)) {
            url = url.Substring(6);
        }

        // Remove the "git@" prefix if it exists.
        if (url.StartsWith("git@", StringComparison.Ordinal)) {
            url = url.Substring(4);
        }

        // If the URL is an HTTP(S) address, check if there's
        // a username in the URL, and if there is, remove it.
        httpMatch = HttpPattern.Match(url);

        if (httpMatch.Success) {
            url = httpMatch.Groups[1].Value + httpMatch.Groups[2].Value;
        }

        if (url.EndsWith("/", StringComparison.Ordinal)) {
            url = url.Substring(0, url.Length - 1);
        }

        return url;
    }

}
