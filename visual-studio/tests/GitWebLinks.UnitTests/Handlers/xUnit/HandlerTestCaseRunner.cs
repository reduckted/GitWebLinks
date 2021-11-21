using System.Reflection;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerTestCaseRunner : XunitTestCaseRunner {

    private readonly string _handlerName;


    public HandlerTestCaseRunner(IXunitTestCase testCase, string displayName, string skipReason, object[] constructorArguments, object[] testMethodArguments, IMessageBus messageBus, ExceptionAggregator aggregator, CancellationTokenSource cancellationTokenSource, string handlerName) : base(testCase, displayName, skipReason, constructorArguments, testMethodArguments, messageBus, aggregator, cancellationTokenSource) {
        _handlerName = handlerName;
    }


    protected override ITest CreateTest(IXunitTestCase testCase, string displayName) {
        return new HandlerTest(testCase, displayName, _handlerName);
    }


    protected override XunitTestRunner CreateTestRunner(
        ITest test,
        IMessageBus messageBus,
        Type testClass,
        object[] constructorArguments,
        MethodInfo testMethod,
        object[] testMethodArguments,
        string skipReason,
        IReadOnlyList<BeforeAfterTestAttribute> beforeAfterAttributes,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource
    ) {
        return new HandlerTestRunner(
            test,
            messageBus,
            testClass,
            constructorArguments,
            testMethod,
            testMethodArguments,
            skipReason,
            beforeAfterAttributes,
            aggregator,
            cancellationTokenSource
        );
    }

}
