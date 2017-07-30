import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { commands, Position, Selection, TextDocument, TextEditor, Uri, window, workspace } from 'vscode';

import { CopyLinkToSelectionCommand } from '../../src/commands/CopyLinkToSelectionCommand';
import { Clipboard } from '../../src/utilities/Clipboard';

import { FINAL_URL, GIT_INFO, MockLinkHandler } from '../test-helpers/MockLinkHandler';


describe('CopyLinkToSelectionCommand', () => {

    let sandbox: sinon.SinonSandbox;
    let clipboardStub: sinon.SinonStub;
    let command: CopyLinkToSelectionCommand | undefined;


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


        command = new CopyLinkToSelectionCommand(GIT_INFO, new MockLinkHandler());

        all = await commands.getCommands();
        expect(all).to.contain('gitweblinks.copySelection');

        command.dispose();
        command = undefined;

        all = await commands.getCommands();
        expect(all).to.not.contain('gitweblinks.copySelection');
    });


    it(`should use the active document's selection and make it one-based.`, async () => {
        let handler: MockLinkHandler;
        let doc: TextDocument;
        let editor: TextEditor;


        handler = new MockLinkHandler();
        command = new CopyLinkToSelectionCommand(GIT_INFO, handler);

        doc = await workspace.openTextDocument(path.resolve(__dirname, '../../../test/test-helpers/data/10lines.txt'));
        editor = await window.showTextDocument(doc);

        editor.selection = new Selection(new Position(1, 3), new Position(5, 2));

        await commands.executeCommand('gitweblinks.copySelection', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(handler.selection).to.deep.equal({ startLine: 2, endLine: 6 });
    });


    it('should copy the URL to the clipboard.', async () => {
        command = new CopyLinkToSelectionCommand(GIT_INFO, new MockLinkHandler());

        await commands.executeCommand('gitweblinks.copySelection', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(clipboardStub.calledWith(FINAL_URL)).to.be.true;
    });

});
