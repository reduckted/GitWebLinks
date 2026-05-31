namespace GitWebLinks;

public interface ILinkTargetLoader {

    Task<IReadOnlyList<LinkTargetListItem>> LoadAsync();

}
