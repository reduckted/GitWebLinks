import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';
import { CustomServerProvider } from '../configuration/CustomServerProvider';

export class GitLabHandler extends LinkHandler {
    private static GITLAB_SERVER: ServerUrl = {
        baseUrl: 'https://gitlab.com',
        sshUrl: 'git@gitlab.com'
    };

    private customServerProvider: CustomServerProvider;

    constructor() {
        super();
        this.customServerProvider = new CustomServerProvider();
    }

    protected getServerUrls(): ServerUrl[] {
        let urls: ServerUrl[];

        urls = [GitLabHandler.GITLAB_SERVER];

        Array.prototype.push.apply(
            urls,
            this.customServerProvider.getServers('gitLabEnterprise')
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
            '-',
            'blob',
            encodeURI(branchOrHash),
            encodeURI(relativePathToFile)
        ].join('/');
    }

    protected getSelectionHash(filePath: string, selection: Selection): string {
        let hash: string;

        hash = `#L${selection.startLine}`;

        if (selection.startLine !== selection.endLine) {
            hash += `-${selection.endLine}`;
        }

        return hash;
    }
}
