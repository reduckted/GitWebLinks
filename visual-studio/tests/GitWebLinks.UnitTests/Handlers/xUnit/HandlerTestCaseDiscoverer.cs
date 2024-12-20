using System.Text.RegularExpressions;
using Xunit.Internal;
using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerTestCaseDiscoverer : IXunitTestCaseDiscoverer {

    public ValueTask<IReadOnlyCollection<IXunitTestCase>> Discover(
        ITestFrameworkDiscoveryOptions discoveryOptions,
        IXunitTestMethod testMethod,
        IFactAttribute factAttribute
    ) {
#pragma warning disable IDE0008 // Use explicit type
        var details = TestIntrospectionHelper.GetTestCaseDetails(
            discoveryOptions,
            testMethod,
            factAttribute
        );
#pragma warning restore IDE0008 // Use explicit type

        return new ValueTask<IReadOnlyCollection<IXunitTestCase>>(
            (
                from definition in TestDefinitionProvider.GetDefinitions()
                select new HandlerTestCase(
                    definition.Name,
                    details.ResolvedTestMethod,
                    definition.Name,
                    $"{details.UniqueID}+{Regex.Replace(definition.Name, "\\s\\.", "_")}",
                    details.Explicit,
                    details.SkipReason,
                    details.SkipType,
                    details.SkipUnless,
                    details.SkipWhen,
                    testMethod.Traits.ToReadWrite(StringComparer.OrdinalIgnoreCase),
                    timeout: details.Timeout
                )
            ).ToList()
        );
    }

}
