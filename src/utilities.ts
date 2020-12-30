import { Repository, RepositoryWithRemote } from './types';

/**
 * Determines whether the given repository has a remote.
 *
 * @param repository The repository to check.
 * @returns True if the repository has a remote; otherwise, false.
 */
export function hasRemote(repository: Repository): repository is RepositoryWithRemote {
    return repository.remote !== undefined;
}

/**
 * Transforms the given remote URL into a standard format.
 *
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

/**
 * Determines whether the given error has th egiven code.
 *
 * @param err The error object.
 * @param code The code to test for.
 * @returns True if the given error has the given error code.
 */
export function isErrorCode(err: unknown, code: string): err is NodeJS.ErrnoException {
    return hasCode(err) && err.code === code;
}

/**
 * Gets the error message from the given error object.
 *
 * @param err The error object.
 * @returns The error message.
 */
export function getErrorMessage(err: unknown): string {
    if (typeof err === 'string') {
        return err;
    }

    if (hasMessage(err)) {
        return err.message;
    }

    return '';
}

/**
 * Determines whether the given error object has a `code` property.
 *
 * @param err The error object.
 * @returns True if the error object has a `code` property; otherwise, false.
 */
function hasCode(err: unknown): err is { code: string } {
    return typeof err === 'object' && err !== null && 'code' in err;
}

/**
 * Determines whether the given error object has a `message` property.
 *
 * @param err The error object.
 * @returns True if the error object has a `message` property; otherwise, false.
 */
function hasMessage(err: unknown): err is { message: string } {
    return typeof err === 'object' && err !== null && 'message' in err;
}
