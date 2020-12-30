import { Repository, RepositoryWithRemote } from './types';

/**
 * Determines whether the given repository has a remote.
 * @param repository The repository to check.
 * @returns True if the repository has a remote; otherwise, false.
 */
export function hasRemote(repository: Repository): repository is RepositoryWithRemote {
    return repository.remote !== undefined;
}

/**
 * Transforms the given remote URL into a standard format.
 * @param remoteUrl The remote URL to normalize.
 * @returns The normalized URL.
 */
export function normalizeRemoteUrl(remoteUrl: string): string {
    let httpMatch: RegExpExecArray | null;

    // Remove the SSH prefix if it exists.
    if (remoteUrl.startsWith('ssh://')) {
        remoteUrl = remoteUrl.substring(6);
    }

    // Remove the "git@" prefix if it exists.
    if (remoteUrl.startsWith('git@')) {
        remoteUrl = remoteUrl.substring(4);
    }

    // If the URL is an HTTP(S) address, check if there's
    // a username in the URL, and if there is, remove it.
    httpMatch = /(https?:\/\/)[^@]+@(.+)/.exec(remoteUrl);

    if (httpMatch) {
        remoteUrl = httpMatch[1] + httpMatch[2];
    }

    return remoteUrl;
}
