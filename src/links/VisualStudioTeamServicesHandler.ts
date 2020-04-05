import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';

export class VisualStudioTeamServicesHandler extends LinkHandler {
    protected getMatchingServerUrl(remoteUrl: string): ServerUrl | undefined {
        let match: RegExpMatchArray | null;

        match = /^([^.]+)@vs-ssh\.visualstudio\.com:22(?:\/([^\/]+))?\/_ssh\/.+$/.exec(
            remoteUrl
        );

        if (!match) {
            match = /^https:\/\/([^.]+)\.visualstudio\.com(?:\/([^\/]+))?\/_git\/.+$/.exec(
                remoteUrl
            );
        }

        if (match) {
            let username: string;
            let collection: string;

            username = match[1];

            if (match[2]) {
                collection = `/${match[2]}`;
            } else {
                collection = '';
            }

            return {
                baseUrl: `https://${username}.visualstudio.com${collection}/_git`,
                sshUrl: `${username}@vs-ssh.visualstudio.com:22${collection}/_ssh`
            };
        }

        return undefined;
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
        let root: string;
        let version: string;
        let branchOrHashPrefix: string;

        if (this.getLinkType() === 'branch') {
            branchOrHashPrefix = 'GB';
        } else {
            branchOrHashPrefix = 'GC';
        }

        // The path to the file is put in the query string,
        // so we need to URI encode the entire path.
        relativePathToFile = encodeURIComponent(relativePathToFile);

        root = [baseUrl, repositoryPath].join('/');
        version = `${branchOrHashPrefix}${encodeURIComponent(branchOrHash)}`;

        return `${root}?path=%2F${relativePathToFile}&version=${version}`;
    }

    protected getSelectionHash(filePath: string, selection: Selection): string {
        let args: string;

        args = `&line=${selection.startLine}`;

        if (selection.startLine !== selection.endLine) {
            args += `&lineEnd=${selection.endLine}`;
        }

        return args;
    }
}
