import { promises as fs } from 'fs';
import * as path from 'path';

import { git } from '../../src/git';

export * from './directory';
export * from './mock-workspace';

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
 * Returns a promise that resolves on the next cycle.
 *
 * @returns The promise that resolves on the next cycle.
 */
export async function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
