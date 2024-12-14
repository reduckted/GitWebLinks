import type { RepositoryState } from '../src/api/git';
import type { Git, GitRemote, GitRepository } from '../src/git';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Uri } from 'vscode';

import { RepositoryFinder } from '../src/repository-finder';
import { Settings } from '../src/settings';

import { getGitService } from './helpers';

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

    describe('findRepository', () => {
        let match: GitRepository | undefined;

        beforeEach(() => {
            sinon.stub(git, 'getRepository').callsFake(() => match);
        });

        it('should not find the info when the path is not in a Git repository.', () => {
            match = undefined;
            expect(finder.findRepository(Uri.file(process.cwd()))).to.be.undefined;
        });

        it('should find the info when the path is in a repository.', () => {
            let origin: GitRemote;

            origin = { name: 'origin', isReadOnly: false };

            match = repository('a', { remotes: [origin] });

            expect(finder.findRepository(Uri.file(process.cwd()))).to.deep.equal({
                root: match.rootUri,
                remote: { name: 'origin', urls: [] }
            });
        });

        it('should use the remote specified in the settings if it exists.', () => {
            let alpha: GitRemote;
            let beta: GitRemote;
            let testing: GitRemote;

            sinon.stub(Settings.prototype, 'getPreferredRemoteName').returns('testing');

            alpha = { name: 'alpha', isReadOnly: false };
            beta = { name: 'beta', isReadOnly: false };
            testing = { name: 'testing', isReadOnly: false };

            match = repository('b', { remotes: [alpha, beta, testing] });

            expect(finder.findRepository(Uri.file(process.cwd()))).to.deep.equal({
                root: match.rootUri,
                remote: { name: 'testing', urls: [] }
            });
        });

        it('should use the first remote alphabetically when the remote specified in the settings does not exist.', () => {
            let alpha: GitRemote;
            let beta: GitRemote;
            let gamma: GitRemote;

            sinon.stub(Settings.prototype, 'getPreferredRemoteName').returns('testing');

            alpha = { name: 'alpha', isReadOnly: false };
            beta = { name: 'beta', isReadOnly: false };
            gamma = { name: 'gamma', isReadOnly: false };

            match = repository('c', { remotes: [alpha, beta, gamma] });

            expect(finder.findRepository(Uri.file(process.cwd()))).to.deep.equal({
                root: match.rootUri,
                remote: { name: 'alpha', urls: [] }
            });
        });

        it('should use the remote URLs that are defined.', () => {
            let getPreferredRemoteName: sinon.SinonStub<[], string>;
            let alpha: GitRemote;
            let beta: GitRemote;
            let gamma: GitRemote;
            let delta: GitRemote;
            let path: Uri;

            getPreferredRemoteName = sinon.stub(Settings.prototype, 'getPreferredRemoteName');

            alpha = { name: 'alpha', isReadOnly: false, fetchUrl: 'a', pushUrl: 'b' };
            beta = { name: 'beta', isReadOnly: false, fetchUrl: 'c' };
            gamma = { name: 'gamma', isReadOnly: false, pushUrl: 'd' };
            delta = { name: 'delta', isReadOnly: false };

            match = repository('d', { remotes: [alpha, beta, gamma, delta] });
            path = Uri.file(process.cwd());

            getPreferredRemoteName.returns('alpha');
            expect(finder.findRepository(path)?.remote?.urls).to.deep.equal(['a', 'b']);

            getPreferredRemoteName.returns('beta');
            expect(finder.findRepository(path)?.remote?.urls).to.deep.equal(['c']);

            getPreferredRemoteName.returns('gamma');
            expect(finder.findRepository(path)?.remote?.urls).to.deep.equal(['d']);

            getPreferredRemoteName.returns('delta');
            expect(finder.findRepository(path)?.remote?.urls).to.be.empty;
        });
    });

    describe('getAllRepositories', () => {
        let repositories: GitRepository[];

        beforeEach(() => {
            repositories = [];
            sinon.stub(git, 'repositories').value(repositories);
        });

        it('should return an empty collection when there are no repositories.', () => {
            repositories.length = 0;
            expect(finder.getAllRepositories()).to.be.empty;
        });

        it('should return information for each repository from the `vscode.git` extension.', () => {
            let alpha: GitRepository;
            let beta: GitRepository;

            alpha = repository('a', { remotes: [{ name: 'origin', isReadOnly: true }] });
            beta = repository('b', { remotes: [{ name: 'origin', isReadOnly: true }] });

            repositories.push(alpha, beta);

            expect(finder.getAllRepositories()).to.deep.equal([
                { root: alpha.rootUri, remote: { name: 'origin', urls: [] } },
                { root: beta.rootUri, remote: { name: 'origin', urls: [] } }
            ]);
        });
    });
});

function repository(root: string, state: Partial<RepositoryState>): GitRepository {
    return {
        rootUri: Uri.file(root),
        state: {
            HEAD: undefined,
            indexChanges: [],
            mergeChanges: [],
            rebaseCommit: undefined,
            refs: [],
            remotes: [],
            submodules: [],
            untrackedChanges: [],
            workingTreeChanges: [],
            ...state
        } satisfies Partial<RepositoryState> as unknown as RepositoryState
    } satisfies Partial<GitRepository> as unknown as GitRepository;
}
