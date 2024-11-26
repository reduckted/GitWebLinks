import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Disposable, EventEmitter, Event, Uri } from 'vscode';

import { API, Remote, Repository } from './api/git';
import { log } from './log';

/**
 * Wrapper for Git access and operations.
 */
export class Git extends Disposable {
    private readonly disposable: Disposable;
    private readonly didChangeRepositories: EventEmitter<void>;

    /**
     *@constructor
     * @param api The Git extension API.
     */
    public constructor(private readonly api: API) {
        super(() => {
            this.disposable.dispose();
        });

        this.didChangeRepositories = new EventEmitter();

        this.disposable = Disposable.from(
            api.onDidOpenRepository((repository) => {
                log(`Repository opened: ${repository.rootUri.toString()}`);
                this.didChangeRepositories.fire();
            }),
            api.onDidCloseRepository((repository) => {
                log(`Repository closed: ${repository.rootUri.toString()}`);
                this.didChangeRepositories.fire();
            })
        );
    }

    /**
     * An event that is emitted when repositories are opened or closed.
     */
    public get onDidChangeRepositories(): Event<void> {
        return this.didChangeRepositories.event;
    }

    /**
     * The opened Git repositories.
     */
    public get repositories(): readonly Repository[] {
        return this.api.repositories;
    }

    /**
     *Gets the repository that contains the given URI.
     *
     * @param uri The URI to find the repository for.
     * @returns The repository, or undefined if the URI is not in a repository.
     */
    public getRepository(uri: Uri): Repository | undefined {
        return this.api.getRepository(uri) ?? undefined;
    }

    /**
     *Executes a Git command.
     *
     * @param root The full path to the root of the repository.
     * @param args The arguments to pass to Git.
     * @returns The output of the command.
     */
    public async exec(root: Uri | string, ...args: string[]): Promise<string> {
        let child: ChildProcessWithoutNullStreams;
        // Handle non-ASCII characters in filenames.
        // See https://stackoverflow.com/questions/4144417/
        args.splice(0, 0, '-c', 'core.quotepath=false');

        log('Executing git %s', args.join(' '));

        child = spawn(this.api.git.path, args, {
            cwd: typeof root === 'string' ? root : root.fsPath
        });

        let [code, stdout, stderr] = await Promise.all([
            new Promise<number>((resolve, reject) => {
                child.once('error', reject);
                child.once('exit', (code) => resolve(code ?? -1));
            }),
            new Promise<string>((resolve) => {
                let buffers: Buffer[];

                buffers = [];

                child.stdout.on('data', (b: Buffer) => buffers.push(b));
                child.stdout.once('close', () => resolve(Buffer.concat(buffers).toString('utf8')));
            }),
            new Promise<string>((resolve) => {
                let buffers: Buffer[];

                buffers = [];

                child.stderr.on('data', (b: Buffer) => buffers.push(b));
                child.stderr.once('close', () => resolve(Buffer.concat(buffers).toString('utf8')));
            })
        ]);

        if (code === 0) {
            return stdout;
        } else {
            throw new Error(`Git exited with code ${code}: ${stderr}`);
        }
    }
}

export type { Remote as GitRemote, Repository as GitRepository };
