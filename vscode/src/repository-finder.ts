import { Uri } from 'vscode';

import { Git, GitRemote, GitRepository } from './git';
import { log } from './log';
import { Settings } from './settings';
import { Repository, Remote } from './types';

/**
 * Finds the repository that a workspace belongs to.
 */
export class RepositoryFinder {
    private readonly settings: Settings = new Settings();

    /**
     * @constructor
     * @param git The Git extension API.
     */
    public constructor(private readonly git: Git) {}

    /**
     * Finds the repository information for the specified file or directory.
     *
     * @param path The full path of the file or directory to find the repository for.
     * @returns The repository that was found; otherwise, `undefined`.
     */
    public findRepository(path: Uri): Repository | undefined {
        let repository: GitRepository | undefined;

        repository = this.git.getRepository(path);

        if (repository) {
            return this.createRepository(repository);
        }

        return undefined;
    }

    /**
     * Gets all repositories in the open workspaces.
     *
     * @returns The repository information.
     */
    public getAllRepositories(): Repository[] {
        return this.git.repositories.map((x) => this.createRepository(x));
    }

    /**
     * Creates a `Repository` object from the given Git repository.
     *
     * @param repository The Git repository.
     * @returns The `Repository` object.
     */
    private createRepository(repository: GitRepository): Repository {
        let remote: Remote | undefined;

        log("Finding remote for '%s'...", repository.rootUri.toString());

        remote = this.findRemote(repository);

        log("Remote is '%s'.", remote?.name ?? '');

        return { root: repository.rootUri, remote };
    }

    /**
     * Finds the remote to use for the repository.
     *
     * @param repository The repository.
     * @returns The preferred remote if it exists, otherwise the first remote alphabetically, or `undefined` if there are no remotes.
     */
    private findRemote(repository: GitRepository): Remote | undefined {
        log('Finding remote repositories...');

        let preferredRemoteName: string;
        let remotes: GitRemote[];
        let remote: GitRemote;

        remotes = repository.state.remotes;

        log('Remotes found: %O', remotes);

        // Use the remote that's specified in the settings if
        // that remote exists; otherwise, just use the first remote.
        preferredRemoteName = this.settings.getPreferredRemoteName();
        remote = remotes.filter((x) => x.name === preferredRemoteName)[0];

        if (!remote) {
            remote = remotes.sort((x, y) => x.name.localeCompare(y.name))[0];
        }

        return {
            name: remote.name,
            urls: [remote.fetchUrl, remote.pushUrl].filter((x) => x !== undefined)
        };
    }
}
