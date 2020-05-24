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
import { GitLabHandler } from '../../src/links/GitLabHandler';
import { setupRepository } from '../test-helpers/setup-repository';
import { ServerUrl } from '../../src/utilities/ServerUrl';
import { CustomServerProvider } from '../../src/configuration/CustomServerProvider';

describe('GitLabHandler', () => {
    function getCloudRemotes(): string[] {
        return [
            'https://gitlab.com/foo/bar.git',
            'https://username@gitlab.com/foo/bar.git',
            'git@gitlab.com:foo/bar.git',
            'ssh://git@gitlab.com:foo/bar.git'
        ];
    }

    function stubGetServers(servers?: ServerUrl[]): void {
        if (!servers) {
            servers = [
                {
                    baseUrl: 'https://local-gitlab',
                    sshUrl: 'git@local-gitlab'
                }
            ];
        }

        sinon
            .stub(CustomServerProvider.prototype, 'getServers')
            .withArgs('gitLabEnterprise')
            .returns(servers);
    }

    afterEach(() => {
        sinon.restore();
    });

    describe('isMatch', () => {
        getCloudRemotes().forEach((remote) => {
            it(`should match GitLab server URL '${remote}'.`, () => {
                let handler: GitLabHandler;

                handler = new GitLabHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        [
            'https://local-gitlab/foo/bar.git',
            'git@local-gitlab:foo/bar.git',
            'ssh://git@local-gitlab:foo/bar.git'
        ].forEach((remote) => {
            it(`should match server URL from settings for remote '${remote}'`, () => {
                let handler: GitLabHandler;

                stubGetServers([
                    {
                        baseUrl: 'https://local-gitlab',
                        sshUrl: 'git@local-gitlab'
                    }
                ]);

                handler = new GitLabHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        it('should not match other servers.', () => {
            let handler: GitLabHandler;

            stubGetServers([
                { baseUrl: 'https://local-gitlab', sshUrl: 'git@local-gitlab' }
            ]);

            handler = new GitLabHandler();

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
            rimraf.sync(root);
        });

        getCloudRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'`, async () => {
                let handler: GitLabHandler;
                let info: GitInfo;
                let fileName: string;

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(
                    root,
                    'projects/markdownlint/karma.conf.js'
                );
                handler = new GitLabHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://gitlab.com/foo/bar/-/blob/master/projects/markdownlint/karma.conf.js'
                );
            });
        });

        it('should create the correct link when the server URL ends with a slash.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers([
                { baseUrl: 'https://local-gitlab/', sshUrl: 'git@local-gitlab' }
            ]);

            info = {
                rootDirectory: root,
                remoteUrl: 'https://local-gitlab/foo/bar.git'
            };
            fileName = path.join(root, 'src/file.txt');
            handler = new GitLabHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-gitlab/foo/bar/-/blob/master/src/file.txt'
            );
        });

        it('should create the correct link when the server URL whends with a colon.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers([
                { baseUrl: 'https://local-gitlab', sshUrl: 'git@local-gitlab:' }
            ]);

            info = {
                rootDirectory: root,
                remoteUrl: 'git@local-gitlab:foo/bar.git'
            };
            fileName = path.join(root, 'src/file.txt');
            handler = new GitLabHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-gitlab/foo/bar/-/blob/master/src/file.txt'
            );
        });

        it('creates correct link when path contains spaces.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@gitlab.com:foo/bar.git'
            };
            fileName = path.join(root, 'src/file with spaces.txt');
            handler = new GitLabHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://gitlab.com/foo/bar/-/blob/master/src/file%20with%20spaces.txt'
            );
        });

        it('should create the correct link with a single line selection.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@gitlab.com:foo/bar.git'
            };
            fileName = path.join(root, 'src/test.txt');
            handler = new GitLabHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 38,
                    endLine: 38,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://gitlab.com/foo/bar/-/blob/master/src/test.txt#L38'
            );
        });

        it('should create the correct link with a multi-line selection.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@gitlab.com:foo/bar.git'
            };
            fileName = path.join(root, 'src/test.txt');
            handler = new GitLabHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 38,
                    endLine: 49,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://gitlab.com/foo/bar/-/blob/master/src/test.txt#L38-49'
            );
        });

        it('should use the current branch.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@gitlab.com:foo/bar.git'
            };
            fileName = path.join(root, 'src/file.txt');
            handler = new GitLabHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/thing');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://gitlab.com/foo/bar/-/blob/feature/thing/src/file.txt'
            );
        });

        it('should use the current hash.', async () => {
            let handler: GitLabHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;

            stubGetServers();

            info = {
                rootDirectory: root,
                remoteUrl: 'git@gitlab.com:foo/bar.git'
            };
            fileName = path.join(root, 'src/file.txt');
            handler = new GitLabHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://gitlab.com/foo/bar/-/blob/${sha}/src/file.txt`
            );
        });
    });
});
