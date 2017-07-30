import { expect } from 'chai';
import * as mkdirp from 'mkdirp';
import * as os from 'os';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { v4 as guid } from 'uuid';

import { Git } from '../../src/git/Git';
import { GitInfo } from '../../src/git/GitInfo';
import { GitInfoFinder } from '../../src/git/GitInfoFinder';


describe('Git', () => {

    describe('find', () => {

        let root: string;


        beforeEach(() => {
            root = path.join(os.tmpdir(), guid());
            mkdirp.sync(root);
        });


        afterEach(() => {
            rimraf.sync(root);
        });


        it('should not find the info when the workspace is not in a Git repository.', async () => {
            let finder: GitInfoFinder;
            let result: GitInfo | undefined;


            finder = new GitInfoFinder();
            result = await finder.find(root);

            expect(result).to.be.undefined;
        });


        it('should find the info when the workspace is at the root of the repository.', async () => {
            let finder: GitInfoFinder;
            let result: GitInfo | undefined;


            await Git.execute(root, 'init');

            finder = new GitInfoFinder();
            result = await finder.find(root);

            expect(result).to.be.undefined;
        });


        it('should find the info when the workspace is below the root of the repository.', async () => {
            let finder: GitInfoFinder;
            let child: string;
            let result: GitInfo | undefined;


            await Git.execute(root, 'init');

            child = path.join(root, 'child');
            mkdirp.sync(child);

            finder = new GitInfoFinder();
            result = await finder.find(child);

            expect(result).to.be.undefined;
        });

    });

});
