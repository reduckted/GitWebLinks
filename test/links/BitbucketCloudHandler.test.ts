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
import { BitbucketCloudHandler } from '../../src/links/BitbucketCloudHandler';

describe('BitbucketCloudHandler', () => {
    function getRemotes(): string[] {
        return [
            'https://bitbucket.org/atlassian/atlassian-bamboo_rest.git',
            'https://username@bitbucket.org/atlassian/atlassian-bamboo_rest.git',
            'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git',
            'ssh://git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
        ];
    }

    describe('isMatch', () => {
        getRemotes().forEach((remote) => {
            it(`should match server '${remote}'.`, () => {
                let handler: BitbucketCloudHandler;

                handler = new BitbucketCloudHandler();

                expect(handler.isMatch(remote)).to.be.true;
            });
        });

        it('should not match other servers.', () => {
            let handler: BitbucketCloudHandler;

            handler = new BitbucketCloudHandler();

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

        getRemotes().forEach((remote) => {
            it(`should create the correct link from the remote URL '${remote}'.`, async () => {
                let handler: BitbucketCloudHandler;
                let info: GitInfo;
                let fileName: string;

                info = { rootDirectory: root, remoteUrl: remote };
                fileName = path.join(root, 'lib/puppet/feature/restclient.rb');
                handler = new BitbucketCloudHandler();

                expect(
                    await handler.makeUrl(info, fileName, undefined)
                ).to.equal(
                    'https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/master/lib/puppet/feature/restclient.rb'
                );
            });
        });

        it('creates correct link when path contains spaces.', async () => {
            let handler: BitbucketCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl:
                    'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
            };
            fileName = path.join(root, 'lib/sub dir/restclient.rb');
            handler = new BitbucketCloudHandler();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/master/lib/sub%20dir/restclient.rb'
            );
        });

        it('creates correct link with single line selection.', async () => {
            let handler: BitbucketCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl:
                    'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
            };
            fileName = path.join(root, 'lib/puppet/feature/restclient.rb');
            handler = new BitbucketCloudHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 2,
                    endLine: 2,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/master/lib/puppet/feature/restclient.rb#restclient.rb-2'
            );
        });

        it('creates correct link with multiple line selection.', async () => {
            let handler: BitbucketCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl:
                    'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
            };
            fileName = path.join(root, 'lib/puppet/feature/restclient.rb');
            handler = new BitbucketCloudHandler();

            expect(
                await handler.makeUrl(info, fileName, {
                    startLine: 1,
                    endLine: 3,
                    startColumn: 1,
                    endColumn: 1
                })
            ).to.equal(
                'https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/master/lib/puppet/feature/restclient.rb#restclient.rb-1:3'
            );
        });

        it('uses the current branch.', async () => {
            let handler: BitbucketCloudHandler;
            let info: GitInfo;
            let fileName: string;

            info = {
                rootDirectory: root,
                remoteUrl:
                    'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
            };
            fileName = path.join(root, 'lib/puppet/feature/restclient.rb');
            handler = new BitbucketCloudHandler();
            type = 'branch';

            await Git.execute(root, 'checkout', '-b', 'feature/thing');

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                'https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/feature/thing/lib/puppet/feature/restclient.rb'
            );
        });

        it('uses the current hash.', async () => {
            let handler: BitbucketCloudHandler;
            let info: GitInfo;
            let fileName: string;
            let sha: string;

            info = {
                rootDirectory: root,
                remoteUrl:
                    'git@bitbucket.org:atlassian/atlassian-bamboo_rest.git'
            };
            fileName = path.join(root, 'lib/puppet/feature/restclient.rb');
            handler = new BitbucketCloudHandler();
            type = 'hash';

            sha = (await Git.execute(root, 'rev-parse', 'HEAD')).trim();

            expect(await handler.makeUrl(info, fileName, undefined)).to.equal(
                `https://bitbucket.org/atlassian/atlassian-bamboo_rest/src/${sha}/lib/puppet/feature/restclient.rb`
            );
        });
    });
});
