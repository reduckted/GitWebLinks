#nullable enable

using Community.VisualStudio.Toolkit;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using System;
using System.Runtime.InteropServices;
using System.Threading;
using Task = System.Threading.Tasks.Task;

namespace GitWebLinks;

[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
[InstalledProductRegistration(Vsix.Name, Vsix.Description, Vsix.Version)]
[ProvideMenuResource("Menus.ctmenu", 1)]
[Guid(PackageGuids.GitWebLinksPackageString)]
[ProvideAutoLoad(UIContextGuids80.SolutionExists, PackageAutoLoadFlags.BackgroundLoad)]
[ProvideService(typeof(ILogger), IsAsyncQueryable = true)]
[ProvideService(typeof(LinkHandlerProvider), IsAsyncQueryable = true)]
[ProvideService(typeof(LinkTargetSelector), IsAsyncQueryable = true)]
[ProvideService(typeof(RepositoryFinder), IsAsyncQueryable = true)]
[ProvideOptionPage(typeof(AzureDevOpsServerOptionsPage), Vsix.Name, AzureDevOpsServerOptionsPage.Name, CategoryID, AzureDevOpsServerOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(BitbucketServerOptionsPage), Vsix.Name, BitbucketServerOptionsPage.Name, CategoryID, BitbucketServerOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GeneralOptionsPage), Vsix.Name, GeneralOptionsPage.Name, CategoryID, GeneralOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GiteaOptionsPage), Vsix.Name, GiteaOptionsPage.Name, CategoryID, GiteaOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GitHubEnterpriseOptionsPage), Vsix.Name, GitHubEnterpriseOptionsPage.Name, CategoryID, GitHubEnterpriseOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GitHubOptionsPage), Vsix.Name, GitHubOptionsPage.Name, CategoryID, GitHubOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GitilesOptionsPage), Vsix.Name, GitilesOptionsPage.Name, CategoryID, GitilesOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
[ProvideOptionPage(typeof(GitLabEnterpriseOptionsPage), Vsix.Name, GitLabEnterpriseOptionsPage.Name, CategoryID, GitLabEnterpriseOptionsPage.ResourceID, true, SupportsProfiles = true, DescriptionResourceId = DescriptionID, CategoryDescriptionResourceId = DescriptionID)]
public class GitWebLinksPackage : ToolkitPackage {

    public const short CategoryID = 100;
    public const string DescriptionID = "101";


    protected async override Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
        TemplateEngine.Initialize();
        await AddServicesAsync();
        await this.RegisterCommandsAsync();
    }


    private async Task AddServicesAsync() {
        ISettings settings;
        ILogger logger;
        Git git;
        LinkHandlerProvider linkHandlerProvider;
        LinkTargetSelector linkTargetSelector;
        RepositoryFinder repositoryFinder;


        settings = new Settings(this);
        logger = await Logger.CreateAsync();
        git = new Git(logger);
        linkHandlerProvider = new LinkHandlerProvider(settings, git, logger);
        linkTargetSelector = new LinkTargetSelector(settings, git, logger);
        repositoryFinder = new RepositoryFinder(git, settings, logger);

        AddService(typeof(LinkHandlerProvider), (_, _, _) => Task.FromResult<object>(linkHandlerProvider));
        AddService(typeof(LinkTargetSelector), (_, _, _) => Task.FromResult<object>(linkTargetSelector));
        AddService(typeof(ILogger), (_, _, _) => Task.FromResult<object>(logger));
        AddService(typeof(RepositoryFinder), (_, _, _) => Task.FromResult<object>(repositoryFinder));
    }

}
