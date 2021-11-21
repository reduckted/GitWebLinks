using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerCustomTestCaseDiscoverer : IXunitTestCaseDiscoverer {

    private readonly IMessageSink _diagnosticMessageSink;


    public HandlerCustomTestCaseDiscoverer(IMessageSink diagnosticMessageSink) {
        _diagnosticMessageSink = diagnosticMessageSink;
    }


    public IEnumerable<IXunitTestCase> Discover(
        ITestFrameworkDiscoveryOptions discoveryOptions,
        ITestMethod testMethod,
        IAttributeInfo factAttribute
    ) {
        foreach (HandlerTestDefinition definition in TestDefinitionProvider.GetDefinitions()) {
            foreach (CustomTest test in definition.Tests.CreateUrl.Misc) {
                yield return new HandlerCustomTestCase(
                    _diagnosticMessageSink,
                    discoveryOptions.MethodDisplayOrDefault(),
                    discoveryOptions.MethodDisplayOptionsOrDefault(),
                    testMethod,
                    definition.Name,
                    test.Name
                );
            }
        }
    }

}
