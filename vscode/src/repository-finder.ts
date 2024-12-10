import { Uri } from 'vscode';

import { Git, Remote, Repository } from './git';
import { log } from './log';
import { Settings } from './settings';
import { RepositoryInfo } from './types';

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
    public findRepositoryInfo(path: Uri): RepositoryInfo | undefined {
        let repository: Repository | undefined;

        repository = this.git.getRepository(path);

        if (repository) {
            return this.createRepositoryInfo(repository);
        }

        return undefined;
    }

    /**
     * Gets all repositories in the open workspaces.
     *
     * @returns The repository information.
     */
    public getAllRepositories(): RepositoryInfo[] {
        return this.git.repositories.map((x) => this.createRepositoryInfo(x));
    }

    /**
     * Creates a `RepositoryInfo` from the given repository.
     *
     * @param repository The repository.
     * @returns The `RepositoryInfo` object.
     */
    private createRepositoryInfo(repository: Repository): RepositoryInfo {
        let remote: Remote | undefined;

        log("Finding remote for '%s'...", repository.rootUri.toString());

        remote = this.findRemote(repository);

        log("Remote is '%s'.", remote?.name ?? '');

        return { repository, remote };
    }

    /**
     * Finds the remote to use for the repository.
     *
     * @param repository The repository.
     * @returns The preferred remote if it exists, otherwise the first remote alphabetically, or `undefined` if there are no remotes.
     */
    private findRemote(repository: Repository): Remote | undefined {
        log('Finding remote repositories...');

        let preferredRemoteName: string;
        let remotes: Remote[];
        let remote: Remote;

        remotes = repository.state.remotes;

        log('Remotes found: %O', remotes);

        // Use the remote that's specified in the settings if
        // that remote exists; otherwise, just use the first remote.
        preferredRemoteName = this.settings.getPreferredRemoteName();
        remote = remotes.filter((x) => x.name === preferredRemoteName)[0];

        if (!remote) {
            remote = remotes.sort((x, y) => x.name.localeCompare(y.name))[0];
        }

        return remote;
    }
}
