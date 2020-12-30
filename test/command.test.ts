import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import {
    env,
    Position,
    Selection,
    TextDocument,
    Uri,
    window,
    workspace,
    WorkspaceFolder
} from 'vscode';

import { Command } from '../src/command';
import { LinkHandler } from '../src/link-handler';
import { STRINGS } from '../src/strings';
import { LinkType, Repository } from '../src/types';

import { MockWorkspaceManager } from './helpers';

const expect = chai.use(sinonChai).expect;

describe('Command', () => {
    let showErrorMessage: sinon.SinonStub;
    let showInformationMessage: sinon.SinonStub;
    let createUrl: sinon.SinonStub;
    let manager: MockWorkspaceManager;
    let handler: LinkHandler;
    let command: Command;
    let workspaceFolder: WorkspaceFolder;
    let folder: Uri;
    let file: Uri;
    let repository: Repository;
    let link: string | undefined;

    beforeEach(() => {
        manager = new MockWorkspaceManager();
        handler = new LinkHandler({
            name: 'Test',
            server: { http: 'http://example.com', ssh: 'ssh://example.com' },
            branch: ['rev-parse'],
            url: '',
            selection: ''
        });

        file = Uri.file('/foo/bar');
        folder = Uri.file('/foo');
        workspaceFolder = { uri: folder, index: 0, name: 'foo' };
        repository = { root: folder.toString(), remote: 'http://example.com' };

        showErrorMessage = sinon
            .stub(window, 'showErrorMessage')
            .returns(Promise.resolve(undefined));

        showInformationMessage = sinon
            .stub(window, 'showInformationMessage')
            .returns(Promise.resolve(undefined));

        createUrl = sinon.stub(handler, 'createUrl');

        link = undefined;
        sinon.stub(env.clipboard, 'writeText').callsFake(async (text) => {
            link = text;
            return Promise.resolve();
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should show an error if the command was invoked for a resource that was not a file.', async () => {
        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(Uri.parse('http://example.com'));

        expectError(STRINGS.command.noFileSelected);
    });

    it('should show an error if the command was not invoked for a resource, and no file is active.', async () => {
        useTextEditor(undefined);

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(undefined);

        expectError(STRINGS.command.noFileSelected);
    });

    it('should show an error if the file is not in a workspace.', async () => {
        useWorkspaceFolder(undefined);

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expectError(STRINGS.command.fileNotInWorkspace(file));
    });

    it('should show an error if the workspace does not have information.', async () => {
        useWorkspaceFolder(workspaceFolder);

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expectError(STRINGS.command.noWorkspaceInfo(folder));
    });

    it('should show an error if the file is not in a repository.', async () => {
        useWorkspaceFolder(workspaceFolder);

        manager.info = { uri: folder, repository: undefined, handler: undefined };
        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expectError(STRINGS.command.notTrackedByGit(folder));
    });

    it('should show an error if the repository does not have a remote.', async () => {
        useWorkspaceFolder(workspaceFolder);

        manager.info = {
            uri: folder,
            repository: { ...repository, remote: undefined },
            handler: undefined
        };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expectError(STRINGS.command.noRemote(folder.toString()));
    });

    it('should show an error if the repository does not have a link handler.', async () => {
        useWorkspaceFolder(workspaceFolder);

        manager.info = { uri: folder, repository, handler: undefined };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expectError(STRINGS.command.noHandler(repository.remote ?? ''));
    });

    it('should not include the selection when not allowed to.', async () => {
        useWorkspaceFolder(workspaceFolder);

        manager.info = { uri: folder, repository, handler };

        command = new Command(manager.asManager(), 'commit', false);
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: undefined
        });
    });

    it('should include the selection when allowed to and the file is in the active editor.', async () => {
        useWorkspaceFolder(workspaceFolder);
        useTextEditor(file, {
            start: new Position(1, 2),
            end: new Position(3, 4)
        });

        manager.info = { uri: folder, repository, handler };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: { startLine: 2, startColumn: 3, endLine: 4, endColumn: 5 }
        });
    });

    it('should not include the selection when allowed to but the file is not in the active editor.', async () => {
        useWorkspaceFolder(workspaceFolder);
        useTextEditor(undefined);

        manager.info = { uri: folder, repository, handler };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: undefined
        });
    });

    getLinkTypes().forEach((type) => {
        it(`should create a link of the specified type (${type ?? 'undefined'}).`, async () => {
            useWorkspaceFolder(workspaceFolder);
            useTextEditor(undefined);

            manager.info = { uri: folder, repository, handler };

            command = new Command(manager.asManager(), type, true);
            await command.execute(file);

            expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
                type,
                selection: undefined
            });
        });
    });

    it('should copy the link to the clipboard.', async () => {
        useWorkspaceFolder(workspaceFolder);
        useTextEditor(undefined);

        manager.info = { uri: folder, repository, handler };
        createUrl.resolves('http://example.com/foo/bar');

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expect(link).to.equal('http://example.com/foo/bar');
    });

    it('should show a message when the link is created.', async () => {
        useWorkspaceFolder(workspaceFolder);
        useTextEditor(undefined);

        manager.info = { uri: folder, repository, handler };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(file);

        expect(showInformationMessage).to.have.been.calledWithExactly(
            STRINGS.command.linkCopied(handler.name)
        );
    });

    it('should use the active text editor to get the file when no resource was specified.', async () => {
        useWorkspaceFolder(workspaceFolder);
        useTextEditor(file);

        manager.info = { uri: folder, repository, handler };

        command = new Command(manager.asManager(), 'commit', true);
        await command.execute(undefined);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
        });
    });

    function useTextEditor(
        uri: Uri | undefined,
        selection?: Pick<Selection, 'start' | 'end'> | undefined
    ): void {
        if (!selection) {
            selection = { start: new Position(0, 0), end: new Position(0, 0) };
        }

        sinon
            .stub(window, 'activeTextEditor')
            .value(uri ? { document: { uri } as TextDocument, selection } : undefined);
    }

    function useWorkspaceFolder(value: WorkspaceFolder | undefined): void {
        sinon.stub(workspace, 'getWorkspaceFolder').returns(value);
    }

    function expectError(message: string): void {
        expect(link, 'link').to.be.undefined;
        expect(showErrorMessage).to.have.been.calledWith(message);
    }

    function getLinkTypes(): (LinkType | undefined)[] {
        return ['commit', 'branch', 'defaultBranch', undefined];
    }
});
