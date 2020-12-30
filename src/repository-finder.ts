import { promises as fs } from 'fs';
import { dirname, join } from 'path';
import { window } from 'vscode';

import { git } from './git';
import { log } from './log';
import { STRINGS } from './strings';
import { Repository } from './types';

/**
 * Finds the repository that a workspace belongs to.
 */
export class RepositoryFinder {
    /**
     * Finds the repository that the specified workspace is within.
     * @param workspaceRoot The full path of the root of the workspace to find the repository for.
     * @returns The repository that was found; otherwise, `undefined`.
     */
    public async find(workspaceRoot: string): Promise<Repository | undefined> {
        try {
            let root: string | undefined;

            log("Finding root directory of Git repository starting from '%s'...", workspaceRoot);

            root = await this.findRepositoryRoot(workspaceRoot);

            log("Root directory is '%s'.", root ?? '');

            if (root) {
                let remote: string | undefined;

                log('Finding remote URL...');

                remote = await this.findRemote(root);

                log("Remote URL is '%s'.", remote ?? '');

                return { root, remote };
            }
        } catch (ex) {
            log("Error finding Git info for path '%s'. %s", workspaceRoot, ex.message || ex);
            window.showErrorMessage(STRINGS.repositoryFinder.failure);
        }

        return undefined;
    }

    /**
     * Finds the root of the repository that contains the specified directory.
     * @param startingDirectory The full path of the directory to start searching from.
     * @returns The root of the repository, or `undefined` if the specified directory is not within a repository.
     */
    private async findRepositoryRoot(startingDirectory: string): Promise<string | undefined> {
        let current: string;
        let previous: string | undefined;

        current = startingDirectory;

        while (current !== previous) {
            try {
                if ((await fs.stat(join(current, '.git'))).isDirectory()) {
                    return current;
                }
            } catch (ex) {
                if (ex.code !== 'ENOENT') {
                    throw ex;
                }
            }

            previous = current;
            current = dirname(current);
        }

        return undefined;
    }

    /**
     * Finds the remote URL to use for the repository.
     * @param root The root of the repository.
     * @returns The URL of the "origin" remote if it exists, otherwise the first remote alphabetically, or `undefined` if there are no remotes.
     */
    private async findRemote(root: string): Promise<string | undefined> {
        let data: string;
        let remotes: Remote[];
        let remote: Remote;

        log('Finding remote repositories...');

        data = await git(root, 'remote', '-v');

        remotes = data
            .split('\n')
            .filter((x) => !!x)
            .map((x) => this.parseRemote(x));

        log('Remotes found: %O', remotes);

        // Use the "origin" remote if it exists;
        // otherwise, just use the first remote.
        remote = remotes.filter((x) => x.name === 'origin')[0];

        if (!remote) {
            remote = remotes.sort((x, y) => x.name.localeCompare(y.name))[0];
        }

        return remote?.url;
    }

    /**
     * Parses a line from Git that lists a remote.
     * @param line The line output by Git.
     * @returns The details of the remote.
     */
    private parseRemote(line: string): Remote {
        let name: string;
        let urlAndType: string;
        let url: string;

        [name, urlAndType] = line.split('\t');
        [url] = urlAndType.split(' ');

        return { name, url };
    }
}

/**
 * A Git remote.
 */
interface Remote {
    /**
     * The name of the remote.
     */
    name: string;

    /**
     * The URL of the remote.
     */
    url: string;
}
