import { expect } from 'chai';
import * as sinon from 'sinon';
import { Uri } from 'vscode';

import { Git, Remote, Repository } from '../src/git';
import { RepositoryFinder } from '../src/repository-finder';
import { Settings } from '../src/settings';

import { getGitService, repository } from './helpers';

describe('RepositoryFinder', function () {
    let finder: RepositoryFinder;
    let git: Git;

    beforeEach(() => {
        git = getGitService();
        finder = new RepositoryFinder(git);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('findRepositoryInfo', () => {
        let match: Repository | undefined;

        beforeEach(() => {
            sinon.stub(git, 'getRepository').callsFake(() => match);
        });

        it('should not find the info when the path is not in a Git repository.', () => {
            match = undefined;
            expect(finder.findRepositoryInfo(Uri.file(process.cwd()))).to.be.undefined;
        });

        it('should find the info when the path is in a repository.', () => {
            let origin: Remote;

            origin = { name: 'origin', isReadOnly: false };

            match = repository({ state: { remotes: [origin] } });

            expect(finder.findRepositoryInfo(Uri.file(process.cwd()))).to.deep.equal({
                repository: match,
                remote: origin
            });
        });

        it('should use the remote specified in the settings if it exists.', () => {
            let alpha: Remote;
            let beta: Remote;
            let testing: Remote;

            sinon.stub(Settings.prototype, 'getPreferredRemoteName').returns('testing');

            alpha = { name: 'alpha', isReadOnly: false };
            beta = { name: 'beta', isReadOnly: false };
            testing = { name: 'testing', isReadOnly: false };

            match = repository({ state: { remotes: [alpha, beta, testing] } });

            expect(finder.findRepositoryInfo(Uri.file(process.cwd()))).to.deep.equal({
                repository: match,
                remote: testing
            });
        });

        it('should use the first remote alphabetically when the remote specified in the settings does not exist.', () => {
            let alpha: Remote;
            let beta: Remote;
            let gamma: Remote;

            sinon.stub(Settings.prototype, 'getPreferredRemoteName').returns('testing');

            alpha = { name: 'alpha', isReadOnly: false };
            beta = { name: 'beta', isReadOnly: false };
            gamma = { name: 'gamma', isReadOnly: false };

            match = repository({ state: { remotes: [alpha, beta, gamma] } });

            expect(finder.findRepositoryInfo(Uri.file(process.cwd()))).to.deep.equal({
                repository: match,
                remote: alpha
            });
        });
    });

    describe('getAllRepositories', () => {
        let repositories: Repository[];

        beforeEach(() => {
            repositories = [];
            sinon.stub(git, 'repositories').value(repositories);
        });

        it('should return an empty collection when there are no repositories.', () => {
            repositories.length = 0;
            expect(finder.getAllRepositories()).to.be.empty;
        });

        it('should return information for each repository from the `vscode.git` extension.', () => {
            let alpha: Repository;
            let beta: Repository;

            alpha = repository({ state: { remotes: [{ name: 'origin', isReadOnly: true }] } });
            beta = repository({ state: { remotes: [{ name: 'origin', isReadOnly: true }] } });

            repositories.push(alpha, beta);

            expect(finder.getAllRepositories()).to.deep.equal([
                { repository: alpha, remote: alpha.state.remotes[0] },
                { repository: beta, remote: beta.state.remotes[0] }
            ]);
        });
    });
});
