import * as os from 'os';
import { join } from 'path';
import { promises as fs } from 'fs';
import * as rimraf from 'rimraf';
import { v4 as guid } from 'uuid';

export class Directory {
    public static async create(): Promise<Directory> {
        let dir: Directory;

        dir = new Directory(join(os.tmpdir(), guid()));
        await fs.mkdir(dir.path, { recursive: true });

        return dir;
    }

    private constructor(public readonly path: string) {}

    public async mkdirp(relative: string): Promise<string> {
        let full: string;

        full = join(this.path, relative);
        await fs.mkdir(full, { recursive: true });

        return full;
    }

    public async dispose(): Promise<void> {
        const MAX_ATTEMPTS = 5;

        for (let i = 1; i <= MAX_ATTEMPTS; i++) {
            try {
                await this.remove();
            } catch (ex) {
                if (i === MAX_ATTEMPTS) {
                    throw ex;
                } else if (ex.code === 'ENOENT') {
                    // Somehow the directory has already
                    // been removed. Our job here is done.
                    return;
                } else if (ex.code === 'EBUSY') {
                    // Something still has a lock on a file
                    // in the directory. Wait a bit and try again.
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } else {
                    throw ex;
                }
            }
        }
    }

    private remove(): Promise<void> {
        return new Promise((resolve, reject) => {
            rimraf(this.path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
