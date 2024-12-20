using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

internal class HandlerTestRunner : XunitTestRunnerBase<HandlerTestRunnerContext, IXunitTest> {

    public static HandlerTestRunner Instance { get; } = new();


    private HandlerTestRunner() { }


    protected override ValueTask<TimeSpan> InvokeTest(HandlerTestRunnerContext context, object? testClassInstance) {
        if (testClassInstance is IHandlerTestClass testClass) {
            testClass.SetDefinition(
                TestDefinitionProvider.GetDefinitions().First((x) => x.Name == context.HandlerName)
            );
        }

        return base.InvokeTest(context, testClassInstance);
    }


    public async ValueTask<RunSummary> RunAsync(
        string handlerName,
        IXunitTest test,
        IMessageBus messageBus,
        object?[] constructorArguments,
        ExplicitOption explicitOption,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource,
        IReadOnlyCollection<IBeforeAfterTestAttribute> beforeAfterAttributes
    ) {
        await using (HandlerTestRunnerContext context = new(
            handlerName,
            test,
            messageBus,
            explicitOption,
            aggregator,
            cancellationTokenSource,
            beforeAfterAttributes,
            constructorArguments
        )) {
            await context.InitializeAsync();
            return await Run(context);
        }
    }

}
