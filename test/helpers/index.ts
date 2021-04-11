import { promises as fs } from 'fs';
import * as path from 'path';

import { git } from '../../src/git';

import { Directory } from './directory';

export { Directory };
export * from './mock-workspace';

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
 * @returns The given root directory.
 */
export async function setupRepository(root: string): Promise<string> {
    await git(root, 'init');
    await git(root, 'config', 'user.email', 'foo@example.com');
    await git(root, 'config', 'user.name', 'foo');

    await fs.writeFile(path.join(root, 'file'), '', 'utf8');

    await git(root, 'add', '.');
    await git(root, 'commit', '-m', '"initial"');

    return root;
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

    remote = await Directory.create();

    try {
        await git(remote.path, 'init', '--bare');
        await git(root, 'remote', 'add', name, remote.path);
        await git(root, 'push', name, 'master');

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
