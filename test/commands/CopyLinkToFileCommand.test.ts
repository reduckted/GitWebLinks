import { expect } from 'chai';
import * as sinon from 'sinon';
import { commands, Uri } from 'vscode';

import { CopyLinkToFileCommand } from '../../src/commands/CopyLinkToFileCommand';
import { Clipboard } from '../../src/utilities/Clipboard';

import { FINAL_URL, GIT_INFO, MockLinkHandler } from '../test-helpers/MockLinkHandler';


describe('CopyLinkToFileCommand', () => {

    let sandbox: sinon.SinonSandbox;
    let clipboardStub: sinon.SinonStub;
    let command: CopyLinkToFileCommand | undefined;


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        clipboardStub = sandbox.stub(Clipboard, 'setText');
    });


    afterEach(() => {
        if (command) {
            command.dispose();
            command = undefined;
        }

        sandbox.restore();
    });


    it('should unregister the command when disposed.', async () => {
        let all: string[];


        command = new CopyLinkToFileCommand(GIT_INFO, new MockLinkHandler());

        all = await commands.getCommands();
        expect(all).to.contain('gitweblinks.copyFile');

        command.dispose();
        command = undefined;

        all = await commands.getCommands();
        expect(all).to.not.contain('gitweblinks.copyFile');
    });


    it('should not use a line selection.', async () => {
        let handler: MockLinkHandler;


        handler = new MockLinkHandler();
        command = new CopyLinkToFileCommand(GIT_INFO, handler);

        await commands.executeCommand('gitweblinks.copyFile', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(handler.selection).to.be.undefined;
    });


    it('should copy the URL to the clipboard.', async () => {
        command = new CopyLinkToFileCommand(GIT_INFO, new MockLinkHandler());

        await commands.executeCommand('gitweblinks.copyFile', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(clipboardStub.calledWith(FINAL_URL)).to.be.true;
    });

});
