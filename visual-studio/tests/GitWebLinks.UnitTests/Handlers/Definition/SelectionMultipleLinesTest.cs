namespace GitWebLinks;

public class SelectionMultipleLinesTest : ISelectionTest {

    public int StartLine { get; set; }


    public int StartColumn { get; set; }


    public int EndLine { get; set; }


    public int EndColumn { get; set; }


    public string Result { get; set; } = "";


    public PartialSelectedRange? ReverseRange { get; set; }

}
