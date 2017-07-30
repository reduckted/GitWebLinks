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
import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { GitHubHandler } from '../../src/links/GitHubHandler';
import { ServerUrl } from '../../src/utilities/ServerUrl';


describe('GitHubHandler', () => {

    let sandbox: sinon.SinonSandbox;


    function getCloudRemotes(): string[] {
        return [
            'https://github.com/dotnet/corefx.git',
            'https://username@github.com/dotnet/corefx.git',
            'git@github.com:dotnet/corefx.git',
            'ssh://git@github.com:dotnet/corefx.git'
        ];
    }


    function stubGetServers(servers?: ServerUrl[]): void {
        if (!servers) {
            servers = [{
                baseUrl: 'https://local-github',
                sshUrl: 'git@local-github'
            }];
        }

        sandbox.stub(CustomServerProvider.prototype, 'getServers').withArgs('gitHubEnterprise').returns(servers);
    }


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });


    afterEach(() => {
        sandbox.restore();
    });


    describe('isMatch', () => {

        [
            'https://github.com/dotnet/corefx.git',
            'git@github.com:dotnet/corefx.git',
            'ssh://git@github.com:dotnet/corefx.git',
        ].forEach((remote) => {
            it(`should match GitHub server URL '${remote}'.`, () => {
                let handler: GitHubHandler;


                stubGetServers();

                handler = new GitHubHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });


        [
            'https://local-github/dotnet/corefx.git',
            'git@local-github:dotnet/corefx.git',
            'ssh://git@local-github:dotnet/corefx.git'
        ].forEach((remote) => {
            it(`should match server URL from settings for remote '${remote}'`, () => {
                let handler: GitHubHandler;


                stubGetServers([{ baseUrl: 'https://local-github', sshUrl: 'git@local-github' }]);

                handler = new GitHubHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });


        it('should not match server URLs not in the settings.', () => {
            let handler: GitHubHandler;


            stubGetServers([{ baseUrl: 'https://local-github', sshUrl: 'git@local-github' }]);

            handler = new GitHubHandler();

            expect(handler.isMatch('https://codeplex.com/foo/bar.git')).to.be.false;
        });

    });


    describe('makeUrl', () => {

        let root: string;


        beforeEach(async () => {
            root = path.join(os.tmpdir(), guid());
            mkdirp.sync(root);

            await Git.execute(root, 'init');

            fs.writeFileSync(path.join(root, 'file'), '', 'utf8');

            await Git.execute(root, 'add', '.');
            await Git.execute(root, 'commit', '-m', '"initial"');
        });


        afterEach(() => {
            rimraf.sync(root);
        });


        getCloudRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'`, async () => {
                let handler: GitHubHandler;
                let info: GitInfo;
                let fileName: string;


                stubGetServers();

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
                handler = new GitHubHandler();

                expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                    'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs',
                );
            });
        });


        it('should create the correct link when the server URL ends with a slash.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers([{ baseUrl: 'https://local-github/', sshUrl: 'git@local-github' }]);

            info = { rootDirectory: root, remoteUrl: 'https://local-github/dotnet/corefx.git' };
            fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-github/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs',
            );
        });


        it('should create the correct link when the server URL whends with a colon.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers([{ baseUrl: 'https://local-github', sshUrl: 'git@local-github:' }]);

            info = { rootDirectory: root, remoteUrl: 'git@local-github:dotnet/corefx.git' };
            fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://local-github/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs',
            );
        });


        it('should create the correct link with a single line selection.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: 'git@github.com:dotnet/corefx.git' };
            fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, { startLine: 38, endLine: 38 })).to.equal(
                'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs#L38',
            );
        });


        it('should create the correct link with a multi-line selection.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: 'git@github.com:dotnet/corefx.git' };
            fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
            handler = new GitHubHandler();

            expect(await handler.makeUrl(info, fileName, { startLine: 38, endLine: 49 })).to.equal(
                'https://github.com/dotnet/corefx/blob/master/src/System.IO.FileSystem/src/System/IO/Directory.cs#L38-L49',
            );
        });


        it('should use the current branch.', async () => {
            let handler: GitHubHandler;
            let info: GitInfo;
            let fileName: string;


            stubGetServers();

            info = { rootDirectory: root, remoteUrl: 'git@github.com:dotnet/corefx.git' };
            fileName = path.join(root, 'src/System.IO.FileSystem/src/System/IO/Directory.cs');
            handler = new GitHubHandler();

            await Git.execute(root, 'checkout', '-b', 'feature/thing');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://github.com/dotnet/corefx/blob/feature/thing/src/System.IO.FileSystem/src/System/IO/Directory.cs',
            );
        });

    });

});
