import { Position, Selection } from 'vscode';

import { Repository, RepositoryWithRemote, SelectedRange } from './types';

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
 * @param url The remote URL to normalize.
 * @returns The normalized URL.
 */
export function normalizeUrl(url: string): string {
    let httpMatch: RegExpExecArray | null;

    // Remove the SSH prefix if it exists.
    if (url.startsWith('ssh://')) {
        url = url.substring(6);
    }

    // Remove the "git@" prefix if it exists.
    if (url.startsWith('git@')) {
        url = url.substring(4);
    }

    // If the URL is an HTTP(S) address, check if there's
    // a username in the URL, and if there is, remove it.
    httpMatch = /(https?:\/\/)[^@]+@(.+)/.exec(url);

    if (httpMatch) {
        url = httpMatch[1] + httpMatch[2];
    }

    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }

    return url;
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

/**
 * Converts a `Selection` to a `SelectedRange`.
 *
 * @param selection The selection to convert.
 * @returns The selected range.
 */
export function toSelectedRange(selection: Selection): SelectedRange {
    // The line numbers are zero-based in the editor,
    // but we need them to be one-based for URLs.
    return {
        startLine: selection.start.line + 1,
        endLine: selection.end.line + 1,
        startColumn: selection.start.character + 1,
        endColumn: selection.end.character + 1
    };
}

/**
 * Converts a `SelectedRange` to a `Selection`.
 *
 * @param selectedRange The selected range to convert.
 * @returns The selection.
 */
export function toSelection(selectedRange: SelectedRange): Selection {
    // The line numbers are one-based in the range,
    // but the editor needs them to be zero-based.
    return new Selection(
        new Position(selectedRange.startLine - 1, selectedRange.startColumn - 1),
        new Position(selectedRange.endLine - 1, selectedRange.endColumn - 1)
    );
}
