import * as fs from 'fs';

import { LinkType, LinkTypeProvider } from '../configuration/LinkTypeProvider';
import { Git } from '../git/Git';
import { GitInfo } from '../git/GitInfo';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { INVALID_PATH } from '../constants';

export abstract class LinkHandler {
    private static SSH_PREFIX: string = 'ssh://';

    private linkTypeProvider: LinkTypeProvider = new LinkTypeProvider();

    public isMatch(remoteUrl: string): boolean {
        return (
            this.getMatchingServerUrl(this.fixRemoteUrl(remoteUrl)) !==
            undefined
        );
    }

    public async makeUrl(
        gitInfo: GitInfo,
        filePath: string,
        selection: Selection | undefined
    ): Promise<string> {
        let url: string;
        let fixedRemoteUrl: string;
        let server: ServerUrl;
        let repositoryPath: string;
        let resolvedPath: string;
        let relativePathToFile: string;
        let branchOrHash: string;
        let baseUrl: string;

        fixedRemoteUrl = this.fixRemoteUrl(gitInfo.remoteUrl);
        server = this.getMatchingServerUrl(fixedRemoteUrl)!;

        // Get the repository's path out of the remote URL.
        repositoryPath = this.getRepositoryPath(fixedRemoteUrl, server);

        // Check if the file selected was a symbolic link
        resolvedPath = await this.handleSymbolicLinkedFiles(filePath);

        if (resolvedPath === INVALID_PATH) {
            return INVALID_PATH;
        }

        relativePathToFile = resolvedPath
            .substring(gitInfo.rootDirectory.length)
            .split('\\')
            .join('/');

        // Trim slashes from the start of the string.
        relativePathToFile = relativePathToFile.replace(/^\/+/, '');

        // Get the current branch name or commit SHA
        // depending on what type of link we need to create.
        if (this.getLinkType() === 'branch') {
            branchOrHash = await this.getCurrentBranch(gitInfo.rootDirectory);
        } else {
            branchOrHash = (
                await Git.execute(gitInfo.rootDirectory, 'rev-parse', 'HEAD')
            ).trim();
        }

        baseUrl = server.baseUrl;

        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.substring(0, baseUrl.length - 1);
        }

        url = this.createUrl(
            baseUrl,
            repositoryPath,
            branchOrHash,
            relativePathToFile
        );

        if (selection) {
            url += this.getSelectionHash(filePath, selection);
        }

        return url;
    }

    protected getMatchingServerUrl(remoteUrl: string): ServerUrl | undefined {
        return this.getServerUrls().filter(
            (x) =>
                remoteUrl.startsWith(x.baseUrl) ||
                remoteUrl.startsWith(x.sshUrl)
        )[0];
    }

    private fixRemoteUrl(remoteUrl: string): string {
        if (remoteUrl.startsWith(LinkHandler.SSH_PREFIX)) {
            // Remove the SSH prefix.
            remoteUrl = remoteUrl.substring(LinkHandler.SSH_PREFIX.length);
        } else {
            let match: RegExpExecArray | null;

            // This will be an HTTP address. Check if there's
            // a username in the URL And if there Is, remove it.
            match = /(https?:\/\/)[^@]+@(.+)/.exec(remoteUrl);

            if (match) {
                remoteUrl = match[1] + match[2];
            }
        }

        return remoteUrl;
    }

    private async handleSymbolicLinkedFiles(
        filePath: string
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.lstat(filePath, function (err, stats) {
                if (stats && stats.isSymbolicLink()) {
                    fs.realpath(filePath, (err, realPath) => {
                        if (!err) {
                            resolve(realPath);
                        } else {
                            resolve(INVALID_PATH);
                        }
                    });
                } else {
                    resolve(filePath);
                }
            });
        });
    }

    protected getServerUrls(): ServerUrl[] {
        // Derived classes should override this if
        // they don't overrides `GetMatchingServerUrl`.
        throw new Error('LinkHandler.getServerUrls must be overridden.');
    }

    private getRepositoryPath(
        remoteUrl: string,
        matchingServer: ServerUrl
    ): string {
        let path: string;

        if (remoteUrl.startsWith(matchingServer.baseUrl)) {
            path = remoteUrl.substring(matchingServer.baseUrl.length);
        } else {
            path = remoteUrl.substring(matchingServer.sshUrl.length);
        }

        // The server URL we matched against may not have ended
        // with a slash (for HTTPS paths) or a colon (for Git paths),
        // which means the path might start with that. Trim that off now.
        if (path.length > 0) {
            if (path[0] === '/' || path[0] === ':') {
                path = path.substring(1);
            }
        }

        if (path.endsWith('.git')) {
            path = path.substring(0, path.length - 4);
        }

        return path;
    }

    protected getLinkType(): LinkType {
        return this.linkTypeProvider.getLinkType();
    }

    protected abstract getCurrentBranch(rootDirectory: string): Promise<string>;

    protected abstract createUrl(
        baseUrl: string,
        repositoryPath: string,
        branchOrHash: string,
        relativePathToFile: string
    ): string;

    protected abstract getSelectionHash(
        filePath: string,
        selection: Selection
    ): string;
}
