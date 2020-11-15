// tslint:disable:max-line-length

import { expect } from 'chai';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';

import {
    LinkType,
    LinkTypeProvider
} from '../../src/configuration/LinkTypeProvider';
import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { AzureDevOpsCloudHandler } from '../../src/links/AzureDevOpsCloudHandler';
import { setupRepository } from '../test-helpers/setup-repository';

describe('AzureDevOpsCloudHandler', () => {
    function getRemotes(): string[] {
        return [
            'https://user@dev.azure.com/user/MyProject/_git/MyRepo',
            'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
        ];
    }

    describe('isMatch', () => {
        getRemotes().forEach((remote) => {
            it(`should match server '${remote}'.`, () => {
                let handler: AzureDevOpsCloudHandler;

                handler = new AzureDevOpsCloudHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        it('should not match other servers.', () => {
            let handler: AzureDevOpsCloudHandler;

            handler = new AzureDevOpsCloudHandler();

            expect(handler.isMatch('https://codeplex.com/foo/bar.git')).to.be
                .false;
        });
    });

    describe('makeUrl', () => {
        let root: string;
        let type: LinkType;

        beforeEach(async () => {
            root = await setupRepository();
            type = 'branch';

            sinon
                .stub(LinkTypeProvider.prototype, 'getLinkType')
                .callsFake(() => type);
        });

        afterEach(() => {
            sinon.restore();
            rimraf.sync(root);
        });

        getRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'.`, async () => {
                let handler: AzureDevOpsCloudHandler;
                let info: GitInfo;
                let fileName: string;

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'src/file.cs');
                handler = new AzureDevOpsCloudHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster'
                );
            });
        });

        it('creates correct link when path contains spaces.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/sub dir/file.cs');
            handler = new AzureDevOpsCloudHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Fsub%20dir%2Ffile.cs&version=GBmaster'
            );
        });

        it('creates correct link with single line selection with no width.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new AzureDevOpsCloudHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 2,
                    endLine: 2,
                    startColumn: 5,
                    endColumn: 5
                })
            ).to.equal(
                'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster&line=2&lineEnd=3&lineStartColumn=1&lineEndColumn=1'
            );
        });

        it('creates correct link with single line selection with non-zero width.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new AzureDevOpsCloudHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 2,
                    endLine: 5,
                    startColumn: 6,
                    endColumn: 9
                })
            ).to.equal(
                'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster&line=2&lineEnd=5&lineStartColumn=6&lineEndColumn=9'
            );
        });

        it('creates correct link with multiple line selection.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new AzureDevOpsCloudHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 1,
                    endLine: 3,
                    startColumn: 6,
                    endColumn: 11
                })
            ).to.equal(
                'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBmaster&line=1&lineEnd=3&lineStartColumn=6&lineEndColumn=11'
            );
        });

        it('uses the current branch.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new AzureDevOpsCloudHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/work');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GBfeature%2Fwork'
            );
        });

        it('uses the current hash.', async () => {
            let handler: AzureDevOpsCloudHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;

            info = {
                rootDirectory: root,
                remoteUrl: 'git@ssh.dev.azure.com:v3/user/MyProject/MyRepo'
            };
            fileName = path.join(root, 'src/file.cs');
            handler = new AzureDevOpsCloudHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://dev.azure.com/user/MyProject/_git/MyRepo?path=%2Fsrc%2Ffile.cs&version=GC${sha}`
            );
        });
    });
});
