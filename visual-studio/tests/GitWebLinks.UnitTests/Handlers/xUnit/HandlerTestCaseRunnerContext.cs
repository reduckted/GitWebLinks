using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerTestCaseRunnerContext : XunitTestCaseRunnerBaseContext<IXunitTestCase, IXunitTest> {

    public HandlerTestCaseRunnerContext(
        string handlerName,
        IXunitTestCase testCase,
        IReadOnlyCollection<IXunitTest> tests,
        IMessageBus messageBus,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource,
        string displayName,
        string? skipReason,
        ExplicitOption explicitOption,
        object?[] constructorArguments
    ) : base(
        testCase,
        tests,
        messageBus,
        aggregator,
        cancellationTokenSource,
        displayName,
        skipReason,
        explicitOption,
        constructorArguments
    ) {
        HandlerName = handlerName;
    }


    public string HandlerName { get; }

}
