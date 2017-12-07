import { expect } from 'chai';
import * as sinon from 'sinon';
import { commands, Uri, window, workspace } from 'vscode';

import { CopyLinkToFileCommand } from '../../src/commands/CopyLinkToFileCommand';
import { LinkTypeProvider } from '../../src/configuration/LinkTypeProvider';
import { LinkHandler } from '../../src/links/LinkHandler';
import { Clipboard } from '../../src/utilities/Clipboard';
import { WorkspaceData } from '../../src/utilities/WorkspaceData';
import { WorkspaceMap } from '../../src/utilities/WorkspaceMap';

import { FINAL_URL, GIT_INFO, MockLinkHandler, WORKSPACE_FOLDER } from '../test-helpers/MockLinkHandler';


describe('CopyLinkToFileCommand', () => {

    let sandbox: sinon.SinonSandbox;
    let clipboardStub: sinon.SinonStub;
    let command: CopyLinkToFileCommand | undefined;


    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        sandbox.stub(LinkTypeProvider.prototype, 'getLinkType').returns('branch');
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
        let map: WorkspaceMap;


        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, new MockLinkHandler());

        command = new CopyLinkToFileCommand(map);

        all = await commands.getCommands();
        expect(all).to.contain('gitweblinks.copyFile');

        command.dispose();
        command = undefined;

        all = await commands.getCommands();
        expect(all).to.not.contain('gitweblinks.copyFile');
    });


    it('should not use a line selection.', async () => {
        let handler: MockLinkHandler;
        let map: WorkspaceMap;


        handler = new MockLinkHandler();

        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, handler);

        command = new CopyLinkToFileCommand(map);

        await commands.executeCommand('gitweblinks.copyFile', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(handler.selection).to.be.undefined;
    });


    it('should copy the URL to the clipboard.', async () => {
        let map: WorkspaceMap;
        let data: WorkspaceData;
        let handler: LinkHandler;


        handler = new MockLinkHandler();

        map = new WorkspaceMap();
        map.add(WORKSPACE_FOLDER, GIT_INFO, handler);

        sandbox.stub(map, 'get').returns({
            handler,
            gitInfo: GIT_INFO
        });

        sandbox.stub(workspace, 'getWorkspaceFolder').returns(WORKSPACE_FOLDER);

        command = new CopyLinkToFileCommand(map);

        await commands.executeCommand('gitweblinks.copyFile', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(clipboardStub.calledWith(FINAL_URL)).to.be.true;
    });


    it('should show a notification if the workspace is not in Git.', async () => {
        let map: WorkspaceMap;
        let showErrorMessage: sinon.SinonStub;


        map = new WorkspaceMap();

        sandbox.stub(workspace, 'getWorkspaceFolder').returns(WORKSPACE_FOLDER);
        showErrorMessage = sandbox.stub(window, 'showErrorMessage');

        command = new CopyLinkToFileCommand(map);

        await commands.executeCommand('gitweblinks.copyFile', Uri.file(`${GIT_INFO.rootDirectory}foo.txt`));

        expect(clipboardStub.called).to.be.false;
        expect(showErrorMessage.called).to.be.true;
    });

});
