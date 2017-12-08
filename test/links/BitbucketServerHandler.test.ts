// tslint:disable:max-line-length

import { expect } from 'chai';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as sinon from 'sinon';
import { v4 as guid } from 'uuid';

import { CustomServerProvider } from '../../src/configuration/CustomServerProvider';
import { LinkType, LinkTypeProvider } from '../../src/configuration/LinkTypeProvider';
import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { BitbucketServerHandler } from '../../src/links/BitbucketServerHandler';
import { ServerUrl } from '../../src/utilities/ServerUrl';


describe('BitbucketServerHandler', () => {

    let sandbox: sinon.SinonSandbox;


    function getRemotes(): string[] {
        return [
            getHttpsRemoteUrl(),
            getHttpsRemoteUrl().replace('https://', 'https://username@'),
            getGitRemoteUrl(),
            `ssh://${getGitRemoteUrl()}`
        ];
    }


    function getHttpsRemoteUrl(): string {
        return 'https://local-bitbucket:7990/context/scm/bb/my-code.git';
    }


    function getGitRemoteUrl(): string {
        return 'git@local-bitbucket:7999/bb/my-code.git';
    }


    function stubGetServers(servers?: ServerUrl[]): void {
        if (!servers) {
            servers = [{
                baseUrl: 'https://local-bitbucket:7990/context',
                sshUrl: 'git@local-bitbucket:7999'
            }];
        }

        sandbox.stub(CustomServerProvider.prototype, 'getServers').withArgs('bitbucketServer').returns(servers);
    }


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });


    afterEach(() => {
        sandbox.restore();
    });


    describe('isMatch', () => {

        getRemotes().forEach((remote) => {
            it(`should match server '${remote}'.`, () => {
                let handler: BitbucketServerHandler;


                stubGetServers();
                handler = new BitbucketServerHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });


        it('should not match other servers.', () => {
            let handler: BitbucketServerHandler;


            stubGetServers();
            handler = new BitbucketServerHandler();

            expect(handler.isMatch('https://codeplex.com/foo/bar.git')).to.be.false;
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

            sandbox.stub(LinkTypeProvider.prototype, 'getLinkType').callsFake(() => type);
            type = 'branch';
        });


        afterEach(() => {
            rimraf.sync(root);
        });


        getRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'.`, async () => {
                let handler: BitbucketServerHandler;
                let info: GitInfo;
                let fileName: string;


                stubGetServers();

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'lib/server/main.cs');
                handler = new BitbucketServerHandler();

                expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                    'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Fmaster',
                );
            });
        });


        getRemotes().forEach((remote) => {
            it(`should create the correct link from the HTTP remote '${remote}'`, async () => {
                let handler: BitbucketServerHandler;
                let info: GitInfo;
                let fileName: string;


                // Swap the `https` URL for an `http` URL if the remote us HTTPS.
                if (remote.startsWith('https://')) {
                    remote = 'http://' + remote.substring('https://'.length);
                }

                stubGetServers([{
                    baseUrl: 'http://local-bitbucket:7990/context',
                    sshUrl: 'git@local-bitbucket:7999'
                }]);

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'lib/server/main.cs');
                handler = new BitbucketServerHandler();

                expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                    'http://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Fmaster',
                );
            });
        });


        it('should creates the correct link when the server URL ends with a slash.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers([{
                baseUrl: 'https://local-bitbucket:7990/context/',
                sshUrl: 'git@local-bitbucket:7999'
            }]);

            info = { rootDirectory: root, remoteUrl: getHttpsRemoteUrl() };
            fileName = path.join(root, 'lib/server/main.cs');
            handler = new BitbucketServerHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Fmaster',
            );
        });


        it('creates correct link when path contains spaces.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: getGitRemoteUrl() };
            fileName = path.join(root, 'lib/sub dir/main.cs');
            handler = new BitbucketServerHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/sub%20dir/main.cs?at=refs%2Fheads%2Fmaster',
            );
        });


        it('creates correct link with single line selection.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: getGitRemoteUrl() };
            fileName = path.join(root, 'lib/server/main.cs');
            handler = new BitbucketServerHandler();

            expect(await handler.makeUrl(info, fileName, { startLine: 2, endLine: 2 })).to.equal(
                'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Fmaster#2',
            );
        });


        it('creates correct link with multiple line selection.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: getGitRemoteUrl() };
            fileName = path.join(root, 'lib/server/main.cs');
            handler = new BitbucketServerHandler();
            type = 'branch';

            expect(await handler.makeUrl(info, fileName, { startLine: 10, endLine: 23 })).to.equal(
                'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Fmaster#10-23',
            );
        });


        it('uses the current branch.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: getGitRemoteUrl() };
            fileName = path.join(root, 'lib/server/main.cs');
            handler = new BitbucketServerHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/thing');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=refs%2Fheads%2Ffeature%2Fthing',
            );
        });


        it('uses the current hash.', async () => {
            let handler: BitbucketServerHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: getGitRemoteUrl() };
            fileName = path.join(root, 'lib/server/main.cs');
            handler = new BitbucketServerHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://local-bitbucket:7990/context/projects/bb/repos/my-code/browse/lib/server/main.cs?at=${sha}`,
            );
        });

    });

});
