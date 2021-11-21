using Xunit.Sdk;

namespace GitWebLinks;

[XunitTestCaseDiscoverer("GitWebLinks.HandlerTestCaseDiscoverer", "GitWebLinks.UnitTests")]
public sealed class HandlerFactAttribute : FactAttribute {
}
