import { promises as fs, Stats } from 'fs';
import { dirname, join } from 'path';

import { git } from './git';
import { log } from './log';
import { Remote, Repository } from './types';
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
        for await (let root of this.internalFindRepositories(workspace)) {
            log("Found a repository at '%s'.", root);
            return true;
        }

        log('No repositories found.');
        return false;
    }

    /**
     * Finds repositories in the specified workspace.
     *
     * @param workspace The root of the workspace to search in.
     * @yields Each repository in the workspace.
     */
    public async *findRepositories(workspace: string): AsyncIterable<Repository> {
        for await (let root of this.internalFindRepositories(workspace)) {
            yield await this.createRepository(root);
        }
    }

    /**
     * Finds repositories in the specified workspace.
     *
     * @param workspace The root of the workspace to search in.
     * @yields Each repository in the workspace.
     */
    private async *internalFindRepositories(workspace: string): AsyncIterable<string> {
        log("Searching for Git repositories in workspace '%s'...", workspace);

        try {
            let root: string | undefined;

            // The most common case is the workspace is the same as
            // the root of the repository, or it's within a repository,
            // so start by searching up from the workspace directory.
            log('Searching up from the workspace root...');
            root = await this.findRepositoryRoot(workspace);

            if (root !== undefined) {
                yield root;
                return;
            }

            // The workspace could also contain multiple repositories, which means
            // we need to search down into the directories within the workspace.
            log('Searching within the workspace...');

            for await (let repository of this.searchForRepositories(workspace)) {
                yield repository;
            }
        } catch (ex) {
            log(
                "Error searching for Git repositories in workspace '%s'. %s",
                workspace,
                getErrorMessage(ex)
            );
        }
    }

    /**
     * Searches for Git repositories within the specified directory.
     *
     * @param dir The directory to search within.
     * @yields Each repository within the given directory.
     */
    private async *searchForRepositories(dir: string): AsyncIterable<string> {
        let children: string[];
        let descendInto: string[];

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

        descendInto = [];

        // Yield any direct child that is a repository root. Any other directories
        // can be descended into, but we'll look at all direct children first.
        for (let child of children) {
            if (await this.isRepositoryRoot(child)) {
                yield child;
            } else {
                descendInto.push(child);
            }
        }

        for (let child of descendInto) {
            for await (let repository of this.searchForRepositories(child)) {
                yield repository;
            }
        }
    }

    /**
     * Finds the repository that the specified file or directory is within.
     *
     * @param path The full path of the file or directory to find the repository for.
     * @returns The repository that was found; otherwise, `undefined`.
     */
    public async findRepository(path: string): Promise<Repository | undefined> {
        try {
            let root: string | undefined;

            log("Finding root directory of Git repository starting from '%s'...", path);

            root = await this.findRepositoryRoot(path);

            log("Root directory is '%s'.", root ?? '');

            if (root) {
                return await this.createRepository(root);
            }
        } catch (ex) {
            log("Error finding repository for path '%s'. %s", path, getErrorMessage(ex));
        }

        return undefined;
    }

    /**
     * Creates a `Repository` from the given root directory.
     *
     * @param root The root of the repository.
     * @returns The `Repository` object.
     */
    private async createRepository(root: string): Promise<Repository> {
        let remote: Remote | undefined;

        log("Finding remote URL for '%s'...", root);

        remote = await this.findRemote(root);

        log("Remote URL is '%s'.", remote ?? '');

        return { root, remote };
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
     * Determines whether the specified path is the root of a repository.
     *
     * @param path The path to check.
     * @returns True if the path is the root of a repository; otherwise, false.
     */
    private async isRepositoryRoot(path: string): Promise<boolean> {
        try {
            let stats: Stats;

            stats = await fs.stat(join(path, '.git'));

            // .git will usually be a directory,
            //  but for a worktree it will be a file.
            if (stats.isDirectory() || stats.isFile()) {
                return true;
            }
        } catch (ex) {
            // An "ENOENT" error means the ".git" file/directory doesn't
            // exist. An "ENOTDIR" error means the given path was a file
            // and by appending ".git" we are trying to treat that file
            // path as a directory. We can ignore both of those errors.
            if (!isErrorCode(ex, 'ENOENT') && !isErrorCode(ex, 'ENOTDIR')) {
                throw ex;
            }
        }

        return false;
    }

    /**
     * Finds the remote URL to use for the repository.
     *
     * @param root The root of the repository.
     * @returns The details of the "origin" remote if it exists, otherwise the first remote alphabetically, or `undefined` if there are no remotes.
     */
    private async findRemote(root: string): Promise<Remote | undefined> {
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

        return remote;
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
