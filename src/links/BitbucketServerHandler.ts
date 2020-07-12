import { CustomServerProvider } from '../configuration/CustomServerProvider';
import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';

export class BitbucketServerHandler extends LinkHandler {
    private customServerProvider: CustomServerProvider;

    constructor() {
        super();
        this.customServerProvider = new CustomServerProvider();
    }

    public readonly name: string = 'Bitbucket Server';

    protected getServerUrls(): ServerUrl[] {
        return this.customServerProvider.getServers('bitbucketServer');
    }

    protected async getCurrentBranch(rootDirectory: string): Promise<string> {
        return (
            await Git.execute(rootDirectory, 'symbolic-ref', 'HEAD')
        ).trim();
    }

    protected createUrl(
        baseUrl: string,
        repositoryPath: string,
        branchOrHash: string,
        relativePathToFile: string
    ): string {
        let match: RegExpExecArray | null;
        let project: string;
        let repo: string;
        let url: string;

        match = /([^\/]+)\/([^\/]+)$/.exec(repositoryPath);

        if (!match) {
            throw new Error(
                'Could not find the project and repository names in the remote URL.'
            );
        }

        project = match[1];
        repo = match[2];

        url = [
            baseUrl,
            'projects',
            project,
            'repos',
            repo,
            'browse',
            encodeURI(relativePathToFile)
        ].join('/');

        // The branch name is specified via a query parameter.
        return url + `?at=${encodeURIComponent(branchOrHash)}`;
    }

    protected getSelectionHash(filePath: string, selection: Selection): string {
        let hash: string;

        hash = `#${selection.startLine}`;

        if (selection.startLine !== selection.endLine) {
            hash += `-${selection.endLine}`;
        }

        return hash;
    }
}
