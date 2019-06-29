// tslint:disable:max-line-length

import { expect } from 'chai';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';
import { v4 as guid } from 'uuid';

import {
    LinkType,
    LinkTypeProvider
} from '../../src/configuration/LinkTypeProvider';
import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { VisualStudioTeamServicesHandler } from '../../src/links/VisualStudioTeamServicesHandler';

describe('VisualStudioTeamServicesHandler', () => {
    function getRemotes(): string[] {
        return getNonCollectionRemotes().concat(getCollectionRemotes());
    }

    function getNonCollectionRemotes(): string[] {
        return [
            'https://foo.visualstudio.com/_git/MyRepo',
            'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
        ];
    }

    function getCollectionRemotes(): string[] {
        return [
            'https://foo.visualstudio.com/DefaultCollection/_git/MyRepo',
            'ssh://foo@vs-ssh.visualstudio.com:22/DefaultCollection/_ssh/MyRepo'
        ];
    }

    describe('isMatch', () => {
        getRemotes().forEach((remote) => {
            it(`should match server '${remote}'.`, () => {
                let handler: VisualStudioTeamServicesHandler;

                handler = new VisualStudioTeamServicesHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        it('should not match other servers.', () => {
            let handler: VisualStudioTeamServicesHandler;

            handler = new VisualStudioTeamServicesHandler();

            expect(handler.isMatch('https://codeplex.com/foo/bar.git')).to.be
                .false;
        });
    });

    describe('makeUrl', () => {
        let root: string;
        let type: LinkType;

        beforeEach(async () => {
            root = path.join(os.tmpdir(), guid());
            mkdirp.sync(root);

            await Git.execute(root, 'init');

            fs.writeFileSync(path.join(root, 'file'), '', 'utf8');

            await Git.execute(root, 'add', '.');
            await Git.execute(root, 'commit', '-m', '"initial"');

            sinon
                .stub(LinkTypeProvider.prototype, 'getLinkType')
                .callsFake(() => type);
            type = 'branch';
        });

        afterEach(() => {
            sinon.restore();
            rimraf.sync(root);
        });

        getNonCollectionRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'.`, async () => {
                let handler: VisualStudioTeamServicesHandler;
                let info: GitInfo;
                let fileName: string;

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'src/file.cs');
                handler = new VisualStudioTeamServicesHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster'
                );
            });
        });

        getCollectionRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'.`, async () => {
                let handler: VisualStudioTeamServicesHandler;
                let info: GitInfo;
                let fileName: string;

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'src/file.cs');
                handler = new VisualStudioTeamServicesHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://foo.visualstudio.com/DefaultCollection/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster'
                );
            });
        });

        it('creates correct link when path contains spaces.', async () => {
            let handler: VisualStudioTeamServicesHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
            };
            fileName = path.join(root, 'src/sub dir/file.cs');
            handler = new VisualStudioTeamServicesHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Fsub%20dir%2Ffile.cs&version=GBmaster'
            );
        });

        it('creates correct link with single line selection.', async () => {
            let handler: VisualStudioTeamServicesHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new VisualStudioTeamServicesHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 2,
                    endLine: 2
                })
            ).to.equal(
                'https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster&line=2'
            );
        });

        it('creates correct link with multiple line selection.', async () => {
            let handler: VisualStudioTeamServicesHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new VisualStudioTeamServicesHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 1,
                    endLine: 3
                })
            ).to.equal(
                'https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster&line=1&lineEnd=3'
            );
        });

        it('uses the current branch.', async () => {
            let handler: VisualStudioTeamServicesHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new VisualStudioTeamServicesHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/work');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBfeature%2Fwork'
            );
        });

        it('uses the current hash.', async () => {
            let handler: VisualStudioTeamServicesHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'ssh://foo@vs-ssh.visualstudio.com:22/_ssh/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new VisualStudioTeamServicesHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://foo.visualstudio.com/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GC${sha}`
            );
        });
    });
});
