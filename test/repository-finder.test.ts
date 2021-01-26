import { expect } from 'chai';
import { promises as fs } from 'fs';
import { join } from 'path';

import { git } from '../src/git';
import { RepositoryFinder } from '../src/repository-finder';

import { Directory, setupRepository } from './helpers';

describe('RepositoryFinder', () => {
    let finder: RepositoryFinder;
    let root: Directory;
    let worktree: Directory | undefined;

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

        it('should return false when the workspace contains a repository that is four levels deep.', async () => {
            let child: string;

            child = await root.mkdirp('first/second/third/fourth');
            await setupRepository(child);

            expect(await finder.hasRepositories(root.path)).to.be.false;
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

    describe('find', () => {
        afterEach(async () => {
            if (worktree) {
                await worktree.dispose();
                worktree = undefined;
            }
        });

        it('should not find the info when the path is not in a Git repository.', async () => {
            expect(await finder.find(root.path)).to.be.undefined;
        });

        it('should find the info when the path is the root of the repository.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.find(root.path)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when the path is below the root of the repository.', async () => {
            let child: string;

            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            child = await root.mkdirp('child');

            expect(await finder.find(child)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when starting from a file.', async () => {
            let file: string;

            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            file = join(root.path, 'file.txt');
            await fs.writeFile(file, '');

            expect(await finder.find(file)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when the file is in a Git worktree.', async () => {
            worktree = await Directory.create();
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');
            await git(root.path, 'worktree', 'add', worktree.path);

            expect(await finder.find(worktree.path)).to.deep.equal({
                root: worktree.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the "origin" remote if it exists.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'alpha', 'https://github.com/example/alpha');
            await git(root.path, 'remote', 'add', 'beta', 'https://github.com/example/beta');
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.find(root.path)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the first remote alphabetically when the "origin" remote does not exist.', async () => {
            await setupRepository(root.path);
            await git(root.path, 'remote', 'add', 'beta', 'https://github.com/example/beta');
            await git(root.path, 'remote', 'add', 'alpha', 'https://github.com/example/alpha');
            await git(root.path, 'remote', 'add', 'gamma', 'https://github.com/example/gamma');

            expect(await finder.find(root.path)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/alpha'
            });
        });
    });
});
