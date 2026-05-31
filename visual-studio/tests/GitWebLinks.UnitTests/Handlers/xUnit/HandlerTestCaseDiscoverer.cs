using System.Linq.Expressions;
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
        IEnumerable<HandlerTestDefinition> definitions;
        HandlerFactAttribute handlerFactAttribute;

#pragma warning disable IDE0008 // Use explicit type
        var details = TestIntrospectionHelper.GetTestCaseDetails(
            discoveryOptions,
            testMethod,
            factAttribute
        );
#pragma warning restore IDE0008 // Use explicit type

        definitions = TestDefinitionProvider.GetDefinitions();
        handlerFactAttribute = (HandlerFactAttribute)factAttribute;

        if (handlerFactAttribute.WhenExists is not null) {
            definitions = definitions.Where(CreateDefinitionPredicate(handlerFactAttribute.WhenExists));
        }

        return new ValueTask<IReadOnlyCollection<IXunitTestCase>>(
            definitions.Select((definition) => new HandlerTestCase(
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
            )).ToList()
        );
    }


    private Func<HandlerTestDefinition, bool> CreateDefinitionPredicate(string requiredPropertyName) {
        Func<UrlTests, object> accessor;
        ParameterExpression definition;


        definition = Expression.Parameter(typeof(UrlTests));

        accessor = Expression.Lambda<Func<UrlTests, object>>(
            Expression.Convert(
                Expression.Property(definition, requiredPropertyName),
                typeof(object)
            ),
            definition
        ).Compile();

        return (definition) => accessor(definition.Tests.CreateUrl) is not null;
    }

}
