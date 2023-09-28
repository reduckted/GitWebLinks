import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as os from 'os';
import { join } from 'path';
import { rimraf } from 'rimraf';

import { isErrorCode } from '../../src/utilities';

/**
 * Provides a temporary directory that can be used in tests.
 */
export class Directory {
    /**
     * Creates a new directory.
     *
     * @returns A promise that resolves to the directory.
     */
    public static async create(): Promise<Directory> {
        let dir: Directory;

        dir = new Directory(join(os.tmpdir(), randomUUID()));
        await fs.mkdir(dir.path, { recursive: true });

        return dir;
    }

    /**
     * @constructor
     * @param path The directory path.
     */
    private constructor(public readonly path: string) {}

    /**
     * Creates a new child directory.
     *
     * @param relative The relative path to create.
     * @returns A promise that resolves to the full path of the new directory.
     */
    public async mkdirp(relative: string): Promise<string> {
        let full: string;

        full = join(this.path, relative);
        await fs.mkdir(full, { recursive: true });

        return full;
    }

    /**
     * Removes the directory.
     */
    public async dispose(): Promise<void> {
        const MAX_ATTEMPTS = 5;

        for (let i = 1; i <= MAX_ATTEMPTS; i++) {
            try {
                await rimraf(this.path);
            } catch (ex) {
                if (i === MAX_ATTEMPTS) {
                    throw ex;
                } else if (isErrorCode(ex, 'ENOENT')) {
                    // Somehow the directory has already
                    // been removed. Our job here is done.
                    return;
                } else if (isErrorCode(ex, 'EBUSY')) {
                    // Something still has a lock on a file
                    // in the directory. Wait a bit and try again.
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                    throw ex;
                }
            }
        }
    }
}
