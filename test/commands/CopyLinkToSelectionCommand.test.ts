import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import {
    commands,
    env,
    MessageItem,
    MessageOptions,
    Position,
    Selection,
    TextDocument,
    TextEditor,
    Uri,
    window,
    workspace
} from 'vscode';

import { CopyLinkToSelectionCommand } from '../../src/commands/CopyLinkToSelectionCommand';
import { LinkTypeProvider } from '../../src/configuration/LinkTypeProvider';
import { LinkHandler } from '../../src/links/LinkHandler';
import { WorkspaceMap } from '../../src/utilities/WorkspaceMap';

import {
    FINAL_URL,
    GIT_INFO,
    MockLinkHandler,
    WORKSPACE_FOLDER
} from '../test-helpers/MockLinkHandler';

describe('CopyLinkToSelectionCommand', () => {
    let writeTextStub: sinon.SinonStub<[string], Thenable<void>>;
    let command: CopyLinkToSelectionCommand | undefined;

    beforeEach(() => {
        sinon.stub(LinkTypeProvider.prototype, 'getLinkType').returns('branch');
        writeTextStub = sinon
            .stub(env.clipboard, 'writeText')
            .returns(Promise.resolve());
    });

    afterEach(() => {
        if (command) {
            command.dispose();
            command = undefined;
        }

        sinon.restore();
    });

    it('should unregister the command when disposed.', async () => {
        let all: string[];
        let map: WorkspaceMap;

        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, new MockLinkHandler());

        command = new CopyLinkToSelectionCommand(map);

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
        let map: WorkspaceMap;

        handler = new MockLinkHandler();

        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, handler);

        sinon.stub(map, 'get').returns({
            handler,
            gitInfo: GIT_INFO
        });

        sinon.stub(workspace, 'getWorkspaceFolder').returns(WORKSPACE_FOLDER);

        command = new CopyLinkToSelectionCommand(map);

        doc = await workspace.openTextDocument(
            path.resolve(
                __dirname,
                '../../../test/test-helpers/data/10lines.txt'
            )
        );
        editor = await window.showTextDocument(doc);

        editor.selection = new Selection(
            new Position(1, 13),
            new Position(5, 12)
        );

        await commands.executeCommand(
            'gitweblinks.copySelection',
            Uri.file(`${GIT_INFO.rootDirectory}foo.txt`)
        );

        expect(handler.selection).to.deep.equal({
            startLine: 2,
            endLine: 6,
            startColumn: 14,
            endColumn: 13
        });
    });

    it('should copy the URL to the clipboard.', async () => {
        let map: WorkspaceMap;
        let handler: LinkHandler;

        handler = new MockLinkHandler();

        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, handler);

        sinon.stub(map, 'get').returns({
            handler,
            gitInfo: GIT_INFO
        });

        sinon.stub(workspace, 'getWorkspaceFolder').returns(WORKSPACE_FOLDER);

        command = new CopyLinkToSelectionCommand(map);

        await commands.executeCommand(
            'gitweblinks.copySelection',
            Uri.file(`${GIT_INFO.rootDirectory}foo.txt`)
        );

        expect(writeTextStub.calledWith(FINAL_URL)).to.be.true;
    });

    it('should show a notification if the workspace is not in Git.', async () => {
        let map: WorkspaceMap;
        let showErrorMessage: sinon.SinonStub<
            [string, MessageOptions, ...MessageItem[]],
            Thenable<MessageItem | undefined>
        >;

        map = new WorkspaceMap();

        sinon.stub(workspace, 'getWorkspaceFolder').returns(WORKSPACE_FOLDER);
        showErrorMessage = sinon.stub(window, 'showErrorMessage');

        command = new CopyLinkToSelectionCommand(map);

        await commands.executeCommand(
            'gitweblinks.copySelection',
            Uri.file(`${GIT_INFO.rootDirectory}foo.txt`)
        );

        expect(writeTextStub.called).to.be.false;
        expect(showErrorMessage.called).to.be.true;
    });
});
