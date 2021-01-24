import { promises as fs, Stats } from 'fs';
import { dirname, join } from 'path';
import { window } from 'vscode';

import { git } from './git';
import { log } from './log';
import { STRINGS } from './strings';
import { Repository } from './types';
import { getErrorMessage, isErrorCode } from './utilities';

const IGNORED_DIRECTORIES: Set<string> = new Set(['node_modules', 'bin', 'obj']);

/**
 * Finds the repository that a workspace belongs to.
 */
export class RepositoryFinder {
    /**
     * Determines whether the specified workspace contains Git repositories.
     *
     * @param workspace The full path of the workspace root to search within.
     * @returns True if the specified workspace contains one or more Git repositories; otherwise, false.
     */
    public async hasRepositories(workspace: string): Promise<boolean> {
        try {
            log("Searching for Git repositories in workspace '%s'...", workspace);

            // The most common case is the workspace is the same as
            // the root of the repository, or it's within a repository,
            // so start by searching up from the workspace directory.
            log('Searching up from the workspace root...');
            if ((await this.findRepositoryRoot(workspace)) !== undefined) {
                log('Found a repository.');
                return true;
            }

            // The workspace could also contan multiple repositories, which means
            // we need to search down into the directories within the workspace.
            log('Searching within the workspace...');

            // If there are repositories within the workspace, they will most likely
            // be near the root of the workspace, so we won't traverse too deeply.
            if (await this.searchForRepositories(workspace, 2)) {
                log('Found a repository.');
                return true;
            }
        } catch (ex) {
            log(
                "Error searching for Git repositories in workspace '%s'. %s",
                workspace,
                getErrorMessage(ex)
            );
        }

        log('No repositories found.');
        return false;
    }

    /**
     * Searches for Git repositories within the specified directory.
     *
     * @param dir The directory to search within.
     * @param depthLimit The number of directories to step down into.
     * @returns True if a repository was found; otherwise, false.
     */
    private async searchForRepositories(dir: string, depthLimit: number): Promise<boolean> {
        let children: string[];

        // Find all child directories, but filter out some special
        // cases that shouldn't ever contain Git repositories.
        children = (await fs.readdir(dir, { withFileTypes: true }))
            .filter((entry) => entry.isDirectory())
            .filter(
                (entry) =>
                    !entry.name.startsWith('.') &&
                    !IGNORED_DIRECTORIES.has(entry.name.toLowerCase())
            )
            .map((entry) => join(dir, entry.name));

        // Check if any of the child directories are a repository first.
        for (let child of children) {
            if (await this.isRepositoryRoot(child)) {
                return true;
            }
        }

        // None of the direct child directories are a
        // repository, so as long as we haven't reached
        // the depth limit, step down into each directory.
        if (depthLimit > 0) {
            for (let child of children) {
                if (await this.searchForRepositories(child, depthLimit - 1)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Finds the repository that the specified file or directory is within.
     *
     * @param path The full path of the file or directory to find the repository for.
     * @returns The repository that was found; otherwise, `undefined`.
     */
    public async find(path: string): Promise<Repository | undefined> {
        try {
            let root: string | undefined;

            log("Finding root directory of Git repository starting from '%s'...", path);

            root = await this.findRepositoryRoot(path);

            log("Root directory is '%s'.", root ?? '');

            if (root) {
                let remote: string | undefined;

                log('Finding remote URL...');

                remote = await this.findRemote(root);

                log("Remote URL is '%s'.", remote ?? '');

                return { root, remote };
            }
        } catch (ex) {
            log("Error finding Git info for path '%s'. %s", path, getErrorMessage(ex));
            void window.showErrorMessage(STRINGS.repositoryFinder.failure);
        }

        return undefined;
    }

    /**
     * Finds the root of the repository that contains the specified file or directory.
     *
     * @param startingPath The full path to start searching from. This could be a file or directory.
     * @returns The root of the repository, or `undefined` if the specified directory is not within a repository.
     */
    private async findRepositoryRoot(startingPath: string): Promise<string | undefined> {
        let current: string;
        let previous: string | undefined;

        current = startingPath;

        while (current !== previous) {
            if (await this.isRepositoryRoot(current)) {
                return current;
            }

            previous = current;
            current = dirname(current);
        }

        return undefined;
    }

    /**
     * Determines whether the specified directory is the root of a repository.
     *
     * @param dir The directory to check.
     * @returns True if the directory is the root of a repository; otherwise, false.
     */
    private async isRepositoryRoot(dir: string): Promise<boolean> {
        try {
            let stats: Stats;

            stats = await fs.stat(join(dir, '.git'));

            // .git will usually be a directory,
            //  but for a worktree it will be a file.
            if (stats.isDirectory() || stats.isFile()) {
                return true;
            }
        } catch (ex) {
            if (!isErrorCode(ex, 'ENOENT')) {
                throw ex;
            }
        }

        return false;
    }

    /**
     * Finds the remote URL to use for the repository.
     *
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
     *
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
