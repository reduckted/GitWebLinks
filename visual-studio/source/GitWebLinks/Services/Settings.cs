#nullable enable

using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Threading;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GitWebLinks;

public class Settings : ISettings {

    private readonly AsyncLazy<GeneralOptionsPage> _generalOptions;
    private readonly Dictionary<string, ServerProvider> _serverProviders;
    private readonly Dictionary<string, IHandlerSettingProvider> _handlerSettings;


    public Settings(AsyncPackage package) {
        _generalOptions = new AsyncLazy<GeneralOptionsPage>(
            () => package.GetDialogPageAsync<GeneralOptionsPage>(),
            joinableTaskFactory: package.JoinableTaskFactory
        );

        _serverProviders = new Dictionary<string, ServerProvider>() {
             { "azureDevOpsServer", new ServerProvider(package, typeof(AzureDevOpsServerOptionsPage))},
             { "bitbucketServer", new ServerProvider(package, typeof(BitbucketServerOptionsPage))},
             { "gitHubEnterprise", new ServerProvider(package, typeof(GitHubEnterpriseOptionsPage))},
             { "gitLabEnterprise", new ServerProvider(package, typeof(GitLabEnterpriseOptionsPage))},
             { "gitiles", new ServerProvider(package, typeof(GitilesOptionsPage))}
         };

        _handlerSettings = new() {
            { "useGitHubDev", new HandlerSettingProvider<GitHubOptionsPage>(package, (x) => x.UseGitHubDev) }
        };
    }


    public async Task<string> GetDefaultBranchAsync() {
        return (await _generalOptions.GetValueAsync()).DefaultBranch;
    }


    public async Task<LinkType> GetDefaultLinkTypeAsync() {
        return (await _generalOptions.GetValueAsync()).DefaultLinkType;
    }


    public async Task<LinkFormat> GetLinkFormatAsync() {
        return (await _generalOptions.GetValueAsync()).LinkFormat;
    }


    public async Task<string> GetPreferredRemoteNameAsync() {
        return (await _generalOptions.GetValueAsync()).PreferredRemoteName;
    }


    public async Task<bool> GetUseShortHashesAsync() {
        return (await _generalOptions.GetValueAsync()).UseShortHashes;
    }


    public async Task<object?> GetHandlerSettingAsync(string key) {
        if (_handlerSettings.TryGetValue(key, out IHandlerSettingProvider setting)) {
            return await setting.GetValueAsync();
        }

        return null;
    }


    public async Task<IReadOnlyList<StaticServer>> GetServersAsync(string type) {
        if (_serverProviders.TryGetValue(type, out ServerProvider provider)) {
            return await provider.GetServersAsync();
        }

        return Array.Empty<StaticServer>();
    }


    private class ServerProvider {

        private readonly AsyncLazy<ServerOptionsPageBase> _options;


        public ServerProvider(AsyncPackage package, Type optionsPageType) {
            _options = new AsyncLazy<ServerOptionsPageBase>(
                () => package.GetDialogPageAsync<ServerOptionsPageBase>(optionsPageType),
                joinableTaskFactory: package.JoinableTaskFactory
            );
        }


        public async Task<IReadOnlyList<StaticServer>> GetServersAsync() {
            return (await _options.GetValueAsync()).GetServers();
        }

    }


    private interface IHandlerSettingProvider {

        Task<object> GetValueAsync();

    }


    private class HandlerSettingProvider<T> : IHandlerSettingProvider where T : DialogPage {

        private readonly AsyncLazy<T> _dialogPage;
        private readonly Func<T, object> _valueProvider;


        public HandlerSettingProvider(AsyncPackage package, Func<T, object> valueProvider) {
            _valueProvider = valueProvider;

            _dialogPage = new AsyncLazy<T>(
                () => package.GetDialogPageAsync<T>(),
                joinableTaskFactory: package.JoinableTaskFactory
            );
        }


        public async Task<object> GetValueAsync() {
            return _valueProvider(await _dialogPage.GetValueAsync());
        }

    }

}
