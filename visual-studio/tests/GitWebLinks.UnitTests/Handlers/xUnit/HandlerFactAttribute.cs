using Xunit.v3;

namespace GitWebLinks;

[XunitTestCaseDiscoverer(typeof(HandlerTestCaseDiscoverer))]
public sealed class HandlerFactAttribute : FactAttribute { }
