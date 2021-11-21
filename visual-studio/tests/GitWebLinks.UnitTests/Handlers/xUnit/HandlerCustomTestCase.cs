using System.ComponentModel;
using System.Text.RegularExpressions;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerCustomTestCase : HandlerTestCase {

    private string _customTestName;


    public HandlerCustomTestCase(
        IMessageSink diagnosticMessageSink,
        TestMethodDisplay defaultMethodDisplay,
        TestMethodDisplayOptions defaultMethodDisplayOptions,
        ITestMethod testMethod,
        string handlerName,
        string customTestName
    ) : base(diagnosticMessageSink, defaultMethodDisplay, defaultMethodDisplayOptions, testMethod, handlerName, new object[] { customTestName }) {
        _customTestName = customTestName;
    }


    [EditorBrowsable(EditorBrowsableState.Never)]
    [Obsolete("Used for deserialization only.")]
    public HandlerCustomTestCase() {
        _customTestName = "";
    }


    protected override string GetDisplayName(IAttributeInfo factAttribute, string displayName) {
        string[] nameParts;


        // The display name of the underlying test case will be the
        // full name of the method (namespace + class + method name).
        // Add the handler name before the method name, and replace
        // the method name with the name of the custom test.
        nameParts = BaseDisplayName.Split('.');
        nameParts[nameParts.Length - 1] = $"[{HandlerName}] {_customTestName}";

        return string.Join(".", nameParts);
    }


    protected override string GetUniqueID() {
        return $"{base.GetUniqueID()}+{Regex.Replace(_customTestName, "\\s\\.", "_")}";
    }


    public override void Deserialize(IXunitSerializationInfo data) {
        _customTestName = data.GetValue<string>("CustomTestName");
        base.Deserialize(data);
    }


    public override void Serialize(IXunitSerializationInfo data) {
        data.AddValue("CustomTestName", _customTestName);
        base.Serialize(data);
    }

}
