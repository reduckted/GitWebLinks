import { CustomServerProvider } from '../configuration/CustomServerProvider';
import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';

export class GitHubHandler extends LinkHandler {
    private static GITHUB_SERVER: ServerUrl = {
        baseUrl: 'https://github.com',
        sshUrl: 'git@github.com'
    };

    private customServerProvider: CustomServerProvider;

    constructor() {
        super();
        this.customServerProvider = new CustomServerProvider();
    }

    public readonly name: string = 'GitHub';

    protected getServerUrls(): ServerUrl[] {
        let urls: ServerUrl[];

        urls = [GitHubHandler.GITHUB_SERVER];

        Array.prototype.push.apply(
            urls,
            this.customServerProvider.getServers('gitHubEnterprise')
        );

        return urls;
    }

    protected async getCurrentBranch(rootDirectory: string): Promise<string> {
        return (
            await Git.execute(
                rootDirectory,
                'rev-parse',
                '--abbrev-ref',
                'HEAD'
            )
        ).trim();
    }

    protected createUrl(
        baseUrl: string,
        repositoryPath: string,
        branchOrHash: string,
        relativePathToFile: string
    ): string {
        return [
            baseUrl,
            repositoryPath,
            'blob',
            encodeURI(branchOrHash),
            encodeURI(relativePathToFile)
        ].join('/');
    }

    protected getSelectionHash(filePath: string, selection: Selection): string {
        let hash: string;

        hash = `#L${selection.startLine}`;

        if (selection.startLine !== selection.endLine) {
            hash += `-L${selection.endLine}`;
        }

        return hash;
    }
}
