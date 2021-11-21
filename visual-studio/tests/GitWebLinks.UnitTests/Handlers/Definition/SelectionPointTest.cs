namespace GitWebLinks;

public class SelectionPointTest : ISelectionTest {

    public int Line { get; set; }


    public string Result { get; set; } = "";


    public PartialSelectedRange? ReverseRange { get; set; }

}
