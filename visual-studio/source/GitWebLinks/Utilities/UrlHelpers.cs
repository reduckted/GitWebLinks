#nullable enable

using System;
using System.Text.RegularExpressions;

namespace GitWebLinks;

public static class UrlHelpers {

    private static readonly Regex HttpPattern = new("(https?://)[^@]+@(.+)");
    private static readonly Regex IsHttpPattern = new("^https?://");
    private static readonly Regex SshUserSpecificationPattern = new("^([^@:]+)@(.+)");


    public static string Normalize(string url) {
        Match httpMatch;
        Match userSpecificationMatch;


        // Remove the SSH prefix if it exists.
        if (url.StartsWith("ssh://", StringComparison.Ordinal)) {
            url = url.Substring(6);
        }

        // Remove the user specification (for example, "git@")
        // from the start of the URL if there is one.
        userSpecificationMatch = SshUserSpecificationPattern.Match(url);

        if (userSpecificationMatch.Success) {
            url = userSpecificationMatch.Groups[2].Value;
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


    public static string GetSshUserSpecification(string url) {
        Match match;

        if (IsHttpPattern.IsMatch(url)) {
            return "";
        }

        if (url.StartsWith("ssh://")) {
            url = url.Substring(6);
        }

        match = SshUserSpecificationPattern.Match(url);

        return match.Success ? match.Groups[1].Value : "";
    }

}
