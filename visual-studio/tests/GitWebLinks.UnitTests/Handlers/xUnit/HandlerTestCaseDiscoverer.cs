using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerTestCaseDiscoverer : IXunitTestCaseDiscoverer {

    private readonly IMessageSink _diagnosticMessageSink;


    public HandlerTestCaseDiscoverer(IMessageSink diagnosticMessageSink) {
        _diagnosticMessageSink = diagnosticMessageSink;
    }


    public IEnumerable<IXunitTestCase> Discover(
        ITestFrameworkDiscoveryOptions discoveryOptions,
        ITestMethod testMethod,
        IAttributeInfo factAttribute
    ) {
        foreach (HandlerTestDefinition definition in TestDefinitionProvider.GetDefinitions()) {
            yield return new HandlerTestCase(
                _diagnosticMessageSink,
                discoveryOptions.MethodDisplayOrDefault(),
                discoveryOptions.MethodDisplayOptionsOrDefault(),
                testMethod,
                definition.Name
            );
        }
    }

}
