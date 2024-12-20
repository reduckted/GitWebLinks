using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerTestCaseRunner : XunitTestCaseRunnerBase<HandlerTestCaseRunnerContext, IXunitTestCase, IXunitTest> {

    public static HandlerTestCaseRunner Instance { get; } = new();


    private HandlerTestCaseRunner() { }


    public async ValueTask<RunSummary> RunAsync(
        string handlerName,
        IXunitTestCase testCase,
        IMessageBus messageBus,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource,
        string displayName,
        string? skipReason,
        ExplicitOption explicitOption,
        object?[] constructorArguments
    ) {
        IReadOnlyCollection<IXunitTest> tests;


        tests = await aggregator.RunAsync(testCase.CreateTests, []);

        if (aggregator.ToException() is Exception ex) {
            if (ex.Message.StartsWith(DynamicSkipToken.Value, StringComparison.Ordinal)) {
                return XunitRunnerHelper.SkipTestCases(
                    messageBus,
                    cancellationTokenSource,
                    [testCase],
                    ex.Message.Substring(DynamicSkipToken.Value.Length),
                    sendTestCaseMessages: false
                );
            } else {
                return XunitRunnerHelper.FailTestCases(
                    messageBus,
                    cancellationTokenSource,
                    [testCase],
                    ex,
                    sendTestCaseMessages: false
                );
            }
        }

        await using (HandlerTestCaseRunnerContext context = new(
            handlerName,
            testCase,
            tests,
            messageBus,
            aggregator,
            cancellationTokenSource,
            displayName,
            skipReason,
            explicitOption,
            constructorArguments
        )) {
            await context.InitializeAsync();
            return await Run(context);
        }
    }


    protected override ValueTask<RunSummary> RunTest(HandlerTestCaseRunnerContext context, IXunitTest test) {
        return HandlerTestRunner.Instance.RunAsync(
            context.HandlerName,
            test,
            context.MessageBus,
            context.ConstructorArguments,
            context.ExplicitOption,
            context.Aggregator.Clone(),
            context.CancellationTokenSource,
            context.BeforeAfterTestAttributes
        );
    }

}
