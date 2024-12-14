import type { Uri } from 'vscode';

import type { Git } from '../../src/git';

import { promises as fs } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';

import { Directory } from './directory';
import { getGitService } from './git-extension';

export { Directory };
export { getGitService };

/**
 * Marks a test suite as being slow.
 *
 * @param suite The test suite to mark as slow.
 */
export function markAsSlow(suite: Mocha.Suite): void {
    suite.slow(1000);
    suite.timeout(10000);
}

/**
 * Sets up a Git repository in the specified directory.
 *
 * @param root The root directory.
 */
export async function setupRepository(root: string): Promise<void> {
    let git: Git;

    git = getGitService();

    // Ensure that the default branch name matches what the tests are expecting
    // (`master` because the tests were written before `main` became the default).
    // The default branch can be specified in the git configuration, but we
    // don't want to change the global configuration when running the tests.
    await git.exec(root, 'init', '--initial-branch=master');
    await git.exec(root, 'config', 'user.email', 'foo@example.com');
    await git.exec(root, 'config', 'user.name', 'foo');

    await fs.writeFile(path.join(root, 'file'), '', 'utf8');

    await git.exec(root, 'add', '.');
    await git.exec(root, 'commit', '-m', '"initial"');
}

/**
 * Sets up a remote for a Git repository.
 *
 * @param root The root directory of the Git repository.
 * @param name The name of the remote.
 * @returns The `Directory` that the remote was created in.
 */
export async function setupRemote(root: string, name: string): Promise<Directory> {
    let remote: Directory;
    let git: Git;

    git = getGitService();

    remote = await Directory.create();

    try {
        await git.exec(remote.path, 'init', '--bare');
        await git.exec(root, 'remote', 'add', name, remote.path);
        await git.exec(root, 'push', name, 'master');

        return remote;
    } catch (ex) {
        await remote.dispose();
        throw ex;
    }
}

/**
 * Returns a promise that resolves on the next cycle.
 *
 * @returns The promise that resolves on the next cycle.
 */
export async function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Creates a Sinon matcher to match a URI.
 *
 * @param expected The expected URI.
 * @returns The matcher.
 */
export function matchUri(expected: Uri): sinon.SinonMatcher {
    return sinon.match((actual: Uri) => expected.toString() === actual.toString());
}
