namespace GitWebLinks;

public class HandlerTestDefinition {

    public string Name { get; set; } = "";


    public TestReverseSettings Reverse { get; } = new();


    public HandlerTestData Tests { get; } = new();

}
