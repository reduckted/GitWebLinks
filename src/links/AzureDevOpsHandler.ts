import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';

export class AzureDevOpsHandler extends LinkHandler {
    protected getMatchingServerUrl(remoteUrl: string): ServerUrl | undefined {
        let match: RegExpMatchArray | null;

        match = /^git@ssh\.dev\.azure\.com:v3\/([^\/]+)\/([^\/]+)\/.+$/.exec(
            remoteUrl
        );

        if (!match) {
            match = /https:\/\/(?:.+@)?dev\.azure\.com\/([^\/]+)\/([^\/]+)\/_git\/.+/.exec(
                remoteUrl
            );
        }

        if (match) {
            let username: string;
            let project: string;

            username = match[1];
            project = match[2];

            return {
                baseUrl: `https://dev.azure.com/${username}/${project}/_git`,
                sshUrl: `git@ssh.dev.azure.com:v3/${username}/${project}`
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
            // The selection spans multiple lines. Add the end line number.
            args += `&lineEnd=${selection.endLine}`;

            // Multi-line selections always need to specify the start
            // and end columns, otherwise nothing ends up being selected.
            args += `&lineStartColumn=${selection.startColumn}&lineEndColumn=${selection.endColumn}`;
        } else {
            // If the single-line selection is an actual selection as opposed to the caret
            // being somewhere on the line but not actually selecting any text, then we will
            // include that same selection range in the link. If there is no selected text, then
            // we'll leave the start and end columns out. If we include them when they are the same
            // value, Azure DevOps will still scroll to the line, but the line won't be highlighted.
            if (selection.startColumn !== selection.endColumn) {
                args += `&lineStartColumn=${selection.startColumn}&lineEndColumn=${selection.endColumn}`;
            } else {
                // The modern repository landing page in Azure DevOps won't highlight
                // any text if we only provide a start line number. We also need to include
                // the start column and end column. Since there is no actual text selected,
                // we will select the whole line by setting the end line number to the next
                // line and the start and end columns to the start of each line.
                args += `&lineEnd=${
                    selection.startLine + 1
                }&lineStartColumn=1&lineEndColumn=1`;
            }
        }

        return args;
    }
}
