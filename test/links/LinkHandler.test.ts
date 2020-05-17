import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as sinon from 'sinon';
import { promisify } from 'util';
import { v4 as guid } from 'uuid';

import { GitInfo } from '../../src/git/GitInfo';
import { LinkHandler } from '../../src/links/LinkHandler';
import { Selection } from '../../src/utilities/Selection';
import rimraf = require('rimraf');
import { ServerUrl } from '../../src/utilities/ServerUrl';
import { setupRepository } from '../test-helpers/setup-repository';

const mkdir = promisify(fs.mkdir);
const symlink = promisify(fs.symlink);
const writeFile = promisify(fs.writeFile);

describe('LinkHandler', () => {
    let root: string;

    afterEach(() => {
        sinon.restore();
        rimraf.sync(root);
    });

    describe('makeUrl', () => {
        it(`should use the real path for files under a directory that is a symbolic link.`, async function () {
            let handler: TestHandler;
            let info: GitInfo;
            let real: string;
            let link: string;
            let url: string;

            root = await setupRepository();

            info = {
                remoteUrl: 'http://example.com',
                rootDirectory: root
            };

            real = path.join(root, 'real');
            await mkdir(real);

            link = path.join(root, 'link');
            if (!(await tryCreateSymlink(real, link, 'dir'))) {
                return this.skip();
            }

            await writeFile(path.join(real, 'foo.js'), '');

            handler = new TestHandler();
            url = await handler.makeUrl(
                info,
                path.join(link, 'foo.js'),
                undefined
            );

            expect(url).to.equal('http://example.com/real/foo.js');
        });

        it(`should use the real path for a file that is a symbolic link.`, async function () {
            let handler: TestHandler;
            let info: GitInfo;
            let real: string;
            let link: string;
            let foo: string;
            let url: string;

            root = await setupRepository();

            info = {
                remoteUrl: 'http://example.com',
                rootDirectory: root
            };

            real = path.join(root, 'real');
            await mkdir(real);

            foo = path.join(real, 'foo.js');
            await writeFile(foo, '');

            link = path.join(root, 'link.js');
            if (!(await tryCreateSymlink(foo, link, 'file'))) {
                return this.skip();
            }

            handler = new TestHandler();
            url = await handler.makeUrl(info, link, undefined);

            expect(url).to.equal('http://example.com/real/foo.js');
        });

        it('should not use the real path when the entire Git repository is under a symbolic link.', async function () {
            let handler: TestHandler;
            let info: GitInfo;
            let real: string;
            let link: string;
            let foo: string;
            let url: string;

            root = path.join(os.tmpdir(), guid());
            real = path.join(root, 'repo');
            await mkdir(real, { recursive: true });

            await setupRepository(real);

            link = path.join(root, 'link');
            if (!(await tryCreateSymlink(real, link, 'dir'))) {
                return this.skip();
            }

            info = {
                remoteUrl: 'http://example.com',
                rootDirectory: link
            };

            foo = path.join(real, 'foo.js');
            await writeFile(foo, '');

            handler = new TestHandler();
            url = await handler.makeUrl(
                info,
                path.join(link, 'foo.js'),
                undefined
            );

            expect(url).to.equal('http://example.com/foo.js');
        });
    });
});

async function tryCreateSymlink(
    target: string,
    symlinkPath: string,
    type: string
): Promise<boolean> {
    try {
        await symlink(target, symlinkPath, type);
        return true;
    } catch (ex) {
        if (ex.code === 'EPERM') {
            // Creating symlinks on Windows requires administrator permissions.
            // We'll return false so that the test can be skipped.
            console.warn('Unable to create symlink. Permission denied.'); // tslint:disable-line: no-console
            return false;
        } else {
            throw ex;
        }
    }
}

class TestHandler extends LinkHandler {
    protected getMatchingServerUrl(remoteUrl: string): ServerUrl | undefined {
        return {
            baseUrl: 'http://example.com',
            sshUrl: 'ssh://example.com'
        };
    }

    protected getCurrentBranch(rootDirectory: string): Promise<string> {
        return Promise.resolve('master');
    }

    protected createUrl(
        baseUrl: string,
        repositoryPath: string,
        branchOrHash: string,
        relativePathToFile: string
    ): string {
        return [baseUrl, relativePathToFile].join('/');
    }

    protected getSelectionHash(filePath: string, selection: Selection): string {
        return '';
    }
}
