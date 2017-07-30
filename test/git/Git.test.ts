import { expect } from 'chai';

import { Git } from '../../src/git/Git';


describe('Git', () => {

    describe('execute', () => {

        it('should execute the command.', async () => {
            let output: string;


            output = await Git.execute(process.cwd(), '--version');

            expect(output).to.match(/^git version /);
        });

    });

});
