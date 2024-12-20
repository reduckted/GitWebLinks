using System.ComponentModel;
using Xunit.Sdk;
using Xunit.v3;

namespace GitWebLinks;

public class HandlerCustomTestCase : HandlerTestCase {

    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("Used for deserialization only.")]
    public HandlerCustomTestCase() {
        CustomTestName = "";
    }


    public HandlerCustomTestCase(
        string handlerName,
        string customTestName,
        IXunitTestMethod testMethod,
        string testCaseDisplayName,
        string uniqueID,
        bool @explicit,
        string? skipReason = null,
        Type? skipType = null,
        string? skipUnless = null,
        string? skipWhen = null,
        Dictionary<string, HashSet<string>>? traits = null,
        string? sourceFilePath = null,
        int? sourceLineNumber = null,
        int? timeout = null
    ) : base(
        handlerName,
        testMethod,
        testCaseDisplayName,
        uniqueID,
        @explicit,
        skipReason,
        skipType,
        skipUnless,
        skipWhen,
        traits,
        [customTestName],
        sourceFilePath,
        sourceLineNumber,
        timeout
    ) {
        CustomTestName = customTestName;
    }


    public string CustomTestName { get; set; }


    protected override void Deserialize(IXunitSerializationInfo data) {
        base.Deserialize(data);
        CustomTestName = data.GetValue<string>(nameof(CustomTestName))!;
    }


    protected override void Serialize(IXunitSerializationInfo data) {
        base.Serialize(data);
        data.AddValue(nameof(CustomTestName), CustomTestName);
    }

}
