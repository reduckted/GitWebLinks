import { expect } from 'chai';
import * as copyPaste from 'copy-paste';

import { Clipboard } from '../../src/utilities/Clipboard';


describe('Clipboard', () => {

    describe('setText', () => {

        it('should set the text on the clipboard.', async () => {
            await Clipboard.setText('foo');

            await new Promise((resolve, reject) => {
                copyPaste.paste((err, content) => {
                    expect(content).to.equal('foo');
                    resolve();
                });
            });
        });

    });

});
