using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerTestRunnerContext : XunitTestRunnerBaseContext<IXunitTest> {

    public HandlerTestRunnerContext(
        string handlerName,
        IXunitTest test,
        IMessageBus messageBus,
        ExplicitOption explicitOption,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource,
        IReadOnlyCollection<IBeforeAfterTestAttribute> beforeAfterTestAttributes,
        object?[] constructorArguments
    ) : base(
        test,
        messageBus,
        explicitOption,
        aggregator,
        cancellationTokenSource,
        beforeAfterTestAttributes,
        constructorArguments
    ) {
        HandlerName = handlerName;
    }


    public string HandlerName { get; }

}
