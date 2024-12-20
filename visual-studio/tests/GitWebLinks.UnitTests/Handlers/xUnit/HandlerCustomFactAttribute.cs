using Xunit.v3;

namespace GitWebLinks;

[XunitTestCaseDiscoverer(typeof(HandlerCustomTestCaseDiscoverer))]
public sealed class HandlerCustomFactAttribute : FactAttribute { }
