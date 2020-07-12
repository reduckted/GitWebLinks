import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { LinkType, LinkTypeProvider } from '../configuration/LinkTypeProvider';
import { Git } from '../git/Git';
import { GitInfo } from '../git/GitInfo';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';

const lstat = promisify(fs.lstat);
const realpath = promisify(fs.realpath);

export abstract class LinkHandler {
    private static SSH_PREFIX: string = 'ssh://';

    private linkTypeProvider: LinkTypeProvider = new LinkTypeProvider();

    public abstract readonly name: string;

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
        let relativePathToFile: string;
        let branchOrHash: string;
        let baseUrl: string;

        fixedRemoteUrl = this.fixRemoteUrl(gitInfo.remoteUrl);
        server = this.getMatchingServerUrl(fixedRemoteUrl)!;

        // Get the repository's path out of the remote URL.
        repositoryPath = this.getRepositoryPath(fixedRemoteUrl, server);

        relativePathToFile = await this.getRelativePath(
            filePath,
            gitInfo.rootDirectory
        );

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

    protected getServerUrls(): ServerUrl[] {
        // Derived classes should override this if
        // they don't overrides `GetMatchingServerUrl`.
        throw new Error('LinkHandler.getServerUrls must be overridden.');
    }

    private getRepositoryPath(
        remoteUrl: string,
        matchingServer: ServerUrl
    ): string {
        let repositoryPath: string;

        if (remoteUrl.startsWith(matchingServer.baseUrl)) {
            repositoryPath = remoteUrl.substring(matchingServer.baseUrl.length);
        } else {
            repositoryPath = remoteUrl.substring(matchingServer.sshUrl.length);
        }

        // The server URL we matched against may not have ended
        // with a slash (for HTTPS paths) or a colon (for Git paths),
        // which means the path might start with that. Trim that off now.
        if (repositoryPath.length > 0) {
            if (repositoryPath[0] === '/' || repositoryPath[0] === ':') {
                repositoryPath = repositoryPath.substring(1);
            }
        }

        if (repositoryPath.endsWith('.git')) {
            repositoryPath = repositoryPath.substring(
                0,
                repositoryPath.length - 4
            );
        }

        return repositoryPath;
    }

    private async getRelativePath(
        filePath: string,
        rootDirectory: string
    ): Promise<string> {
        // If the file is a symbolic link, or is under a directory that's a
        // symbolic link, then we want to resolve the path to the real file
        // because the sybmolic link won't be in the Git repository.
        if (await this.isSymbolicLink(filePath, rootDirectory)) {
            try {
                filePath = await realpath(filePath);

                // Getting the real path of the file resolves all symbolic links,
                // which means if the reposotiry is also under a symbolic link,
                // then the new file path may no longer be under the root directory.
                // We can fix this by also getting the real path of the root directory.
                rootDirectory = await realpath(rootDirectory);
            } catch (ex) {
                // Provide a nicer error message that
                // explains what we were trying to do.
                throw new Error(
                    `Unable to resolve the symbolic link '${filePath}' to a real path.\n${ex}`
                );
            }
        }

        // Get the relative path, then normalize
        // the separators to forward slashes.
        return path.relative(rootDirectory, filePath).replace(/\\/g, '/');
    }

    private async isSymbolicLink(
        filePath: string,
        rootDirectory: string
    ): Promise<boolean> {
        // Check if the file is a symbolic link. If it isn't, then walk up
        // the tree to see if an ancestor directory is a symbolic link. Keep
        // stepping up until we reach the root directory of the repository,
        // because we only need to resolve symbolic links within the repository.
        // If the entire repository is under a symbolic link, then we don't
        // want to resolve paths to somewhere outside the repository.
        while (filePath !== rootDirectory) {
            let stats: fs.Stats;
            let parent: string;

            try {
                stats = await lstat(filePath);
            } catch (ex) {
                // Assume that the path isn't a symbolic link.
                return false;
            }

            if (stats.isSymbolicLink()) {
                return true;
            }

            parent = path.dirname(filePath);

            if (parent === filePath) {
                // We can't go any higher, so the
                // path cannot be a symbolic link.
                return false;
            }

            filePath = parent;
        }

        return false;
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
