using Xunit.Sdk;

namespace GitWebLinks;

public class HandlerTest : XunitTest {

    public HandlerTest(IXunitTestCase testCase, string displayName, string handlerName) : base(testCase, displayName) {
        HandlerName = handlerName;
    }


    public string HandlerName { get; }

}
