import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as guid } from 'uuid';

import { Git } from '../../src/git/Git';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

export async function setupRepository(root?: string): Promise<string> {
    if (!root) {
        root = path.join(os.tmpdir(), guid());
        await mkdir(root, { recursive: true });
    }

    await Git.execute(root, 'init');
    await Git.execute(root, 'config', 'user.email', 'foo@example.com');
    await Git.execute(root, 'config', 'user.name', 'foo');

    await writeFile(path.join(root, 'file'), '', 'utf8');

    await Git.execute(root, 'add', '.');
    await Git.execute(root, 'commit', '-m', '"initial"');

    return root;
}
