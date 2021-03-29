import { expect } from 'chai';
import { promises as fs } from 'fs';
import { join } from 'path';

import { git } from '../src/git';
import { RepositoryFinder } from '../src/repository-finder';
import { Repository } from '../src/types';

import { Directory, markAsSlow, setupRepository } from './helpers';

describe('RepositoryFinder', function () {
    let finder: RepositoryFinder;
    let root: Directory;
    let worktree: Directory | undefined;

    // We need to create repositories, so mark the
    // tests as being a bit slower than other tests.
    markAsSlow(this);

    beforeEach(async () => {
        finder = new RepositoryFinder();
        root = await Directory.create();
    });

    afterEach(async () => {
        await root.dispose();
    });

    describe('hasRepositories', () => {
        it('should return false when the workspace is not in a Git repository.', async () => {
            expect(await finder.hasRepositories(root.path)).to.be.false;
        });

        it('should return false when the workspace does not contain any Git repositories.', async () => {
            await root.mkdirp('a/b/c');
            await root.mkdirp('d/e/f');
            expect(await finder.hasRepositories(root.path)).to.be.false;
        });

        it('should return true when the workspace is at the root of the repository.', async () => {
            await setupRepository(root.path);

            expect(await finder.hasRepositories(root.path)).to.be.true;
        });

        it('should return true when the workspace is within a repository.', async () => {
            let child: string;

            await setupRepository(root.path);

            child = await root.mkdirp('child');

            expect(await finder.hasRepositories(child)).to.be.true;
        });

        ['first', 'first/second', 'first/second/third'].forEach((path) => {
            it(`should return true when the workspace contains a repository in a child directory of '${path}'.`, async () => {
                let child: string;

                child = await root.mkdirp(path);
                await setupRepository(child);

                expect(await finder.hasRepositories(root.path)).to.be.true;
            });
        });

        ['node_modules', 'bin', 'obj', '.vscode', '.github'].forEach((dir) => {
            it(`should ignore the child directory '${dir}'.`, async () => {
                let child: string;

                child = await root.mkdirp(dir);
                await setupRepository(child);

                expect(await finder.hasRepositories(root.path)).to.be.false;
            });
        });
    });

    describe('findRepository', () => {
        afterEach(async () => {
            if (worktree) {
                await worktree.dispose();
                worktree = undefined;
            }
        });

        it('should not find the info when the path is not in a Git repository.', async () => {
            expect(await finder.findRepository(root.path)).to.be.undefined;
        });

        it('should find the info when the path is the root of the repository.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.findRepository(root.path)).to.deep.equal({
                root: root.path,
                remoteName: 'origin',
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when the path is below the root of the repository.', async () => {
            let child: string;

            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            child = await root.mkdirp('child');

            expect(await finder.findRepository(child)).to.deep.equal({
                root: root.path,
                remoteName: 'origin',
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when starting from a file.', async () => {
            let file: string;

            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            file = join(root.path, 'file.txt');
            await fs.writeFile(file, '');

            expect(await finder.findRepository(file)).to.deep.equal({
                root: root.path,
                remoteName: 'origin',
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when the file is in a Git worktree.', async () => {
            worktree = await Directory.create();
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');
            await git(root.path, 'worktree', 'add', worktree.path);

            expect(await finder.findRepository(worktree.path)).to.deep.equal({
                root: worktree.path,
                remoteName: 'origin',
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the "origin" remote if it exists.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'alpha', 'https://github.com/example/alpha');
            await git(root.path, 'remote', 'add', 'beta', 'https://github.com/example/beta');
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.findRepository(root.path)).to.deep.equal({
                root: root.path,
                remoteName: 'origin',
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the first remote alphabetically when the "origin" remote does not exist.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'beta', 'https://github.com/example/beta');
            await git(root.path, 'remote', 'add', 'alpha', 'https://github.com/example/alpha');
            await git(root.path, 'remote', 'add', 'gamma', 'https://github.com/example/gamma');

            expect(await finder.findRepository(root.path)).to.deep.equal({
                root: root.path,
                remoteName: 'alpha',
                remote: 'https://github.com/example/alpha'
            });
        });
    });

    describe('findRepositories', () => {
        it('should return an empty collection when the workspace is not in a Git repository.', async () => {
            expect(await findRoots(root.path)).to.be.empty;
        });

        it('should return an empty collection when the workspace does not contain any Git repositories.', async () => {
            await root.mkdirp('a/b/c');
            await root.mkdirp('d/e/f');
            expect(await findRoots(root.path)).to.be.empty;
        });

        it('should return one repository when the workspace is at the root of the repository.', async () => {
            await setupRepository(root.path);

            expect(await findRoots(root.path)).to.deep.equal([root.path]);
        });

        it('should return one repository when the workspace is within a repository.', async () => {
            let child: string;

            await setupRepository(root.path);

            child = await root.mkdirp('child');

            expect(await findRoots(child)).to.deep.equal([root.path]);
        });

        ['first', 'first/second', 'first/second/third'].forEach((path) => {
            it(`should return one repository when the workspace contains a repository in a child directory of '${path}'.`, async () => {
                let child: string;
                let repository: string;

                child = await root.mkdirp(path);
                repository = await setupRepository(child);

                expect(await findRoots(root.path)).to.deep.equal([repository]);
            });
        });

        ['node_modules', 'bin', 'obj', '.vscode', '.github'].forEach((dir) => {
            it(`should ignore the child directory '${dir}'.`, async () => {
                let child: string;

                child = await root.mkdirp(dir);
                await setupRepository(child);

                expect(await findRoots(root.path)).to.be.empty;
            });
        });

        it('should find all repositories within the workspace.', async function () {
            let alpha: string;
            let beta: string;
            let gamma: string;
            let delta: string;

            // We have to make a few repositories,
            // so increase the "slow" threshold.
            this.slow(4000);

            alpha = await root.mkdirp('top/alpha');
            beta = await root.mkdirp('top/beta');
            gamma = await root.mkdirp('top/second/gamma');
            delta = await root.mkdirp('top/second/third/fourth/delta');
            await root.mkdirp('top/second/other');

            await setupRepository(alpha);
            await setupRepository(beta);
            await setupRepository(gamma);
            await setupRepository(delta);

            expect((await findRoots(root.path)).sort()).to.deep.equal([alpha, beta, gamma, delta]);
        });

        it('should get the remote for each repository.', async function () {
            let alpha: string;
            let beta: string;
            let gamma: string;
            let repositories: Repository[];

            // We have to make a few repositories,
            // so increase the "slow" threshold.
            this.slow(3000);

            alpha = await root.mkdirp('alpha');
            beta = await root.mkdirp('beta');
            gamma = await root.mkdirp('gamma');

            await setupRepository(alpha);
            await setupRepository(beta);
            await setupRepository(gamma);

            await git(alpha, 'remote', 'add', 'origin', 'https://github.com/example/alpha');
            await git(gamma, 'remote', 'add', 'origin', 'https://github.com/example/gamma');

            repositories = [];

            for await (let repository of finder.findRepositories(root.path)) {
                repositories.push(repository);
            }

            repositories.sort((x, y) => x.root.localeCompare(y.root));

            expect(repositories).to.deep.equal([
                { root: alpha, remoteName: 'origin', remote: 'https://github.com/example/alpha' },
                { root: beta, remoteName: undefined, remote: undefined },
                { root: gamma, remoteName: 'origin', remote: 'https://github.com/example/gamma' }
            ]);
        });

        async function findRoots(folder: string): Promise<string[]> {
            let repositories: string[];

            repositories = [];

            for await (let repository of finder.findRepositories(folder)) {
                repositories.push(repository.root);
            }

            return repositories;
        }
    });
});
