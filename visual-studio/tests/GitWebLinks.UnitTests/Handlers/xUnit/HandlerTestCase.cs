using System.ComponentModel;
using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerTestCase : XunitTestCase, ISelfExecutingXunitTestCase {

    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("Used for deserialization only.")]
    public HandlerTestCase() {
        HandlerName = "";
    }


    public HandlerTestCase(
        string handlerName,
        IXunitTestMethod testMethod,
        string testCaseDisplayName,
        string uniqueID,
        bool @explicit,
        string? skipReason = null,
        Type? skipType = null,
        string? skipUnless = null,
        string? skipWhen = null,
        Dictionary<string, HashSet<string>>? traits = null,
        object?[]? testMethodArguments = null,
        string? sourceFilePath = null,
        int? sourceLineNumber = null,
        int? timeout = null
    ) : base(
        testMethod,
        testCaseDisplayName,
        uniqueID,
        @explicit,
        skipReason,
        skipType,
        skipUnless,
        skipWhen,
        traits,
        testMethodArguments,
        sourceFilePath,
        sourceLineNumber,
        timeout
    ) {
        HandlerName = handlerName;
    }


    protected string HandlerName { get; private set; }


    protected override void Deserialize(IXunitSerializationInfo data) {
        base.Deserialize(data);
        HandlerName = data.GetValue<string>(nameof(HandlerName))!;
    }


    protected override void Serialize(IXunitSerializationInfo data) {
        base.Serialize(data);
        data.AddValue(nameof(HandlerName), HandlerName);
    }


    public ValueTask<RunSummary> Run(
        ExplicitOption explicitOption,
        IMessageBus messageBus,
        object?[] constructorArguments,
        ExceptionAggregator aggregator,
        CancellationTokenSource cancellationTokenSource
    ) {
        return HandlerTestCaseRunner.Instance.RunAsync(
            HandlerName,
            this,
            messageBus,
            aggregator.Clone(),
            cancellationTokenSource,
            TestCaseDisplayName,
            SkipReason,
            explicitOption,
            constructorArguments
        );
    }

}
