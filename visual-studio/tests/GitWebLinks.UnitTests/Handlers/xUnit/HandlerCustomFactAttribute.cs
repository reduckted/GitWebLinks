using Xunit.Sdk;

namespace GitWebLinks;

[XunitTestCaseDiscoverer("GitWebLinks.HandlerCustomTestCaseDiscoverer", "GitWebLinks.UnitTests")]
public sealed class HandlerCustomFactAttribute : FactAttribute {
}
