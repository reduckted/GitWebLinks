import { expect } from 'chai';

import { git } from '../src/git';
import { RepositoryFinder } from '../src/repository-finder';
import { Directory } from './helpers';

describe('RepositoryFinder', () => {
    describe('find', () => {
        let finder: RepositoryFinder;
        let root: Directory;

        beforeEach(async () => {
            finder = new RepositoryFinder();
            root = await Directory.create();
        });

        afterEach(async () => {
            await root.dispose();
        });

        it('should not find the info when the workspace is not in a Git repository.', async () => {
            expect(await finder.find(root.path)).to.be.undefined;
        });

        it('should find the info when the workspace is at the root of the repository.', async () => {
            await git(root.path, 'init');
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.find(root.path)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should find the info when the workspace is below the root of the repository.', async () => {
            let child: string;

            await git(root.path, 'init');
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            child = await root.mkdirp('child');

            expect(await finder.find(child)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the "origin" remote if it exists.', async () => {
            await git(root.path, 'init');
            await git(root.path, 'remote', 'add', 'alpha', 'https://github.com/example/alpha');
            await git(root.path, 'remote', 'add', 'beta', 'https://github.com/example/beta');
            await git(root.path, 'remote', 'add', 'origin', 'https://github.com/example/repo');

            expect(await finder.find(root.path)).to.deep.equal({
                root: root.path,
                remote: 'https://github.com/example/repo'
            });
        });

        it('should use the first remote alphabetically when the "origin" remote does not exist.', async () => {
            await git(root.path, 'init');
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
