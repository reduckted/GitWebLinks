using System.ComponentModel;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerTestCase : XunitTestCase {

    private string _handlerName;

    public HandlerTestCase(
        IMessageSink diagnosticMessageSink,
        TestMethodDisplay defaultMethodDisplay,
        TestMethodDisplayOptions defaultMethodDisplayOptions,
        ITestMethod testMethod,
        string handlerName,
        object[]? testMethodArguments = null
    ) : base(diagnosticMessageSink, defaultMethodDisplay, defaultMethodDisplayOptions, testMethod, testMethodArguments) {
        _handlerName = handlerName;
    }


    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("Used for deserialization only.")]
    public HandlerTestCase() {
        _handlerName = "";
    }


    protected string HandlerName => _handlerName;


    protected override string GetDisplayName(IAttributeInfo factAttribute, string displayName) {
        string[] nameParts;


        // The base display name will be the full name of
        // the method (namespace + class + method name).
        // Add the handler name to the start of the method name.
        nameParts = BaseDisplayName.Split('.');
        nameParts[nameParts.Length - 1] = $"[{HandlerName}] {nameParts[nameParts.Length - 1]}";

        return string.Join(".", nameParts);
    }


    protected override string GetUniqueID() {
        return $"{base.GetUniqueID()}+{HandlerName.Replace(" ", "_")}";
    }


    public override void Deserialize(IXunitSerializationInfo data) {
        _handlerName = data.GetValue<string>("HandlerName");
        base.Deserialize(data);
    }


    public override void Serialize(IXunitSerializationInfo data) {
        data.AddValue("HandlerName", HandlerName);
        base.Serialize(data);
    }


    public override Task<RunSummary> RunAsync(IMessageSink diagnosticMessageSink, IMessageBus messageBus, object[] constructorArguments, ExceptionAggregator aggregator, CancellationTokenSource cancellationTokenSource) {
        return new HandlerTestCaseRunner(
            this,
            DisplayName,
            SkipReason,
            constructorArguments,
            TestMethodArguments,
            messageBus,
            aggregator,
            cancellationTokenSource,
            HandlerName
        ).RunAsync();
    }

}
