import { spawnPromise } from 'spawn-rx';

import { log } from './log';

/**
 * Checks if Git exists and can be called.
 * @returns True if Git exists; otherwise, false.
 */
export async function initialize(): Promise<boolean> {
    try {
        await git(process.cwd(), '--version');
        return true;
    } catch (ex) {
        log('Could not find Git. %s', ex.message || ex);
        return false;
    }
}

/**
 * Executes Git.
 * @param root The full path of the root of the repository.
 * @param args The arguments to pass to Git.
 * @returns The output from Git.
 */
export function git(root: string, ...args: string[]): Promise<string> {
    // Handle non-ASCII characters in filenames.
    // See https://stackoverflow.com/questions/4144417/
    args.splice(0, 0, '-c', 'core.quotepath=false');

    log('Executing git %s', args.join(' '));

    return spawnPromise('git', args, { cwd: root });
}
