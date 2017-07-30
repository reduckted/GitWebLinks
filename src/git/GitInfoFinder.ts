import * as fs from 'fs';
import * as path from 'path';

import { Git } from './Git';
import { GitInfo } from './GitInfo';


interface Remote {
    name: string;
    url: string;
}


export class GitInfoFinder {

    public async find(workspaceRoot: string): Promise<GitInfo | undefined> {
        let root: string | undefined;


        root = await this.findGitRoot(workspaceRoot);

        if (root) {
            let remote: string | undefined;


            remote = await this.findRemote(root);

            if (remote) {
                return { rootDirectory: root, remoteUrl: remote };
            }
        }

        return undefined;
    }


    private async findGitRoot(startingDirectory: string): Promise<string | undefined> {
        let dir: string;


        dir = startingDirectory;

        while (dir) {
            let parent: string;


            if (await this.directoryExists(path.join(dir, '.git'))) {
                return dir;
            }

            parent = path.dirname(dir);

            if (parent === dir) {
                break;
            }

            dir = parent;
        }

        return undefined;
    }


    private async directoryExists(dir: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            fs.stat(dir, (err, stats) => {
                resolve(!err && stats.isDirectory());
            });
        });
    }


    private async findRemote(root: string): Promise<string | undefined> {
        let data: string;
        let remotes: Remote[];
        let remote: Remote;


        data = await Git.execute(root, 'remote', '-v');

        remotes = data.split('\n').filter((x) => !!x).map((x) => this.parseRemote(x));

        // Use the "origin" remote if it exists;
        // otherwise, just use the first remote.
        remote = remotes.filter((x) => x.name === 'origin')[0];

        if (!remote) {
            remotes.sort((x, y) => x.name.localeCompare(y.name));
            remote = remotes[0];
        }

        if (remote) {
            return remote.url;
        }

        return undefined;
    }


    private parseRemote(line: string): Remote {
        let name: string;
        let urlAndType: string;
        let url: string;


        [name, urlAndType] = line.split('\t');
        [url] = urlAndType.split(' ');

        return { name, url };
    }

}
