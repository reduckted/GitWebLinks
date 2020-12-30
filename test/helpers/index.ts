import { promises as fs } from 'fs';
import * as path from 'path';

import { git } from '../../src/git';

export * from './directory';
export * from './mock-workspace';
export * from './mock-workspace-manager';

export async function setupRepository(root: string): Promise<string> {
    await git(root, 'init');
    await git(root, 'config', 'user.email', 'foo@example.com');
    await git(root, 'config', 'user.name', 'foo');

    await fs.writeFile(path.join(root, 'file'), '', 'utf8');

    await git(root, 'add', '.');
    await git(root, 'commit', '-m', '"initial"');

    return root;
}

export function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
}
