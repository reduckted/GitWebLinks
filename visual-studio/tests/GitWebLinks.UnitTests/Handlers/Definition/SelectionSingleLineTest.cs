namespace GitWebLinks;

public class SelectionSingleLineTest : ISelectionTest {

    public int Line { get; set; }


    public int StartColumn { get; set; }


    public int EndColumn { get; set; }


    public string Result { get; set; } = "";


    public PartialSelectedRange? ReverseRange { get; set; }

}
