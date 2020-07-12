import { spawnPromise } from 'spawn-rx';
import { Logger } from '../utilities/Logger';

let gitPath: string = 'git';

export class Git {
    public static async test(): Promise<void> {
        await spawnPromise(gitPath, ['--version'], process.cwd());
    }

    public static async execute(
        root: string,
        ...args: string[]
    ): Promise<string> {
        // Handle non-ASCII characters in filenames.
        // See https://stackoverflow.com/questions/4144417/
        args.splice(0, 0, '-c', 'core.quotepath=false');

        Logger.writeLine('Executing git', `${gitPath} ${args.join(' ')}`);

        return spawnPromise(gitPath, args, { cwd: root });
    }
}
