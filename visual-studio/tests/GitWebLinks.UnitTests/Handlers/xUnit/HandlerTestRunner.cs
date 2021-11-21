using System.Reflection;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerTestRunner : XunitTestRunner {

    public HandlerTestRunner(ITest test, IMessageBus messageBus, Type testClass, object[] constructorArguments, MethodInfo testMethod, object[] testMethodArguments, string skipReason, IReadOnlyList<BeforeAfterTestAttribute> beforeAfterAttributes, ExceptionAggregator aggregator, CancellationTokenSource cancellationTokenSource) : base(test, messageBus, testClass, constructorArguments, testMethod, testMethodArguments, skipReason, beforeAfterAttributes, aggregator, cancellationTokenSource) { }


    protected override Task<decimal> InvokeTestMethodAsync(ExceptionAggregator aggregator) {
        return new HandlerTestInvoker(Test, MessageBus, TestClass, ConstructorArguments, TestMethod, TestMethodArguments, BeforeAfterAttributes, aggregator, CancellationTokenSource).RunAsync();
    }

}
