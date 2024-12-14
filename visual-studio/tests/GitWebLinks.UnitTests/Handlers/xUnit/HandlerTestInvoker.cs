using System.Reflection;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

internal class HandlerTestInvoker : XunitTestInvoker {

    public HandlerTestInvoker(ITest test, IMessageBus messageBus, Type testClass, object[] constructorArguments, MethodInfo testMethod, object[] testMethodArguments, IReadOnlyList<BeforeAfterTestAttribute> beforeAfterAttributes, ExceptionAggregator aggregator, CancellationTokenSource cancellationTokenSource) : base(test, messageBus, testClass, constructorArguments, testMethod, testMethodArguments, beforeAfterAttributes, aggregator, cancellationTokenSource) { }


    protected override object? CreateTestClass() {
        IHandlerTestClass? testClass = null;

        if (!MessageBus.QueueMessage(new TestClassConstructionStarting(Test))) {
            CancellationTokenSource.Cancel();

        } else {
            try {
                if (!CancellationTokenSource.IsCancellationRequested) {
                    Timer.Aggregate(() => {
                        testClass = (IHandlerTestClass)Activator.CreateInstance(TestClass, ConstructorArguments);
                        testClass.SetDefinition(TestDefinitionProvider.GetDefinitions().First((x) => x.Name == ((HandlerTest)Test).HandlerName));
                    });
                }

            } finally {
                if (!MessageBus.QueueMessage(new TestClassConstructionFinished(Test))) {
                    CancellationTokenSource.Cancel();
                }
            }
        }

        return testClass;
    }

}
