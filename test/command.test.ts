import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { env, MessageItem, Position, Selection, TextDocument, Uri, window } from 'vscode';

import { Command } from '../src/command';
import { LinkHandler } from '../src/link-handler';
import { LinkHandlerSelector } from '../src/link-handler-selector';
import { RepositoryFinder } from '../src/repository-finder';
import { STRINGS } from '../src/strings';
import { LinkType, Repository } from '../src/types';

const expect = chai.use(sinonChai).expect;

describe('Command', () => {
    let showErrorMessage: sinon.SinonStub;
    let showInformationMessage: sinon.SinonStub;
    let createUrl: sinon.SinonStub;
    let finder: RepositoryFinder;
    let selector: LinkHandlerSelector;
    let handler: LinkHandler | undefined;
    let command: Command;
    let folder: Uri;
    let file: Uri;
    let repository: Repository | undefined;
    let link: string | undefined;

    beforeEach(() => {
        finder = new RepositoryFinder();
        sinon.stub(finder, 'find').callsFake(async () => Promise.resolve(repository));

        selector = new LinkHandlerSelector();
        sinon.stub(selector, 'select').callsFake(() => handler);

        handler = new LinkHandler({
            name: 'Test',
            server: { http: 'http://example.com', ssh: 'ssh://example.com' },
            branch: ['rev-parse'],
            url: '',
            selection: ''
        });

        file = Uri.file('/foo/bar');
        folder = Uri.file('/foo');
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
        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(Uri.parse('http://example.com'));

        expectError(STRINGS.command.noFileSelected);
    });

    it('should show an error if the command was not invoked for a resource, and no file is active.', async () => {
        useTextEditor(undefined);

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(undefined);

        expectError(STRINGS.command.noFileSelected);
    });

    it('should show an error if the file is not in a repository.', async () => {
        repository = undefined;
        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expectError(STRINGS.command.notTrackedByGit(file));
    });

    it('should show an error if the repository does not have a remote.', async () => {
        repository = { root: folder.toString(), remote: undefined };

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expectError(STRINGS.command.noRemote(folder.toString()));
    });

    it('should show an error if the repository does not have a link handler.', async () => {
        handler = undefined;

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expectError(STRINGS.command.noHandler(repository?.remote ?? ''));
    });

    it('should use the active text editor to get the file when no resource was specified.', async () => {
        useTextEditor(file);

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(undefined);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
        });
    });

    it('should not include the selection when not allowed to.', async () => {
        command = new Command(finder, selector, 'commit', false, 'copy');
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: undefined
        });
    });

    it('should include the selection when allowed to and the file is in the active editor.', async () => {
        useTextEditor(file, {
            start: new Position(1, 2),
            end: new Position(3, 4)
        });

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: { startLine: 2, startColumn: 3, endLine: 4, endColumn: 5 }
        });
    });

    it('should not include the selection when allowed to but the file is not in the active editor.', async () => {
        useTextEditor(undefined);

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
            type: 'commit',
            selection: undefined
        });
    });

    getLinkTypes().forEach((type) => {
        it(`should create a link of the specified type (${type ?? 'undefined'}).`, async () => {
            useTextEditor(undefined);

            command = new Command(finder, selector, type, true, 'copy');
            await command.execute(file);

            expect(createUrl).to.have.been.calledWithExactly(repository, file.fsPath, {
                type,
                selection: undefined
            });
        });
    });

    it('should copy the link to the clipboard when the command action is "copy".', async () => {
        useTextEditor(undefined);

        createUrl.resolves('http://example.com/foo/bar');

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expect(link).to.equal('http://example.com/foo/bar');
    });

    it('should show a message when the link is created when the command action is "copy".', async () => {
        useTextEditor(undefined);

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expect(showInformationMessage).to.have.been.calledWithExactly(
            STRINGS.command.linkCopied(handler?.name ?? ''),
            { title: STRINGS.command.openInBrowser, action: 'open' }
        );
    });

    it('should open the link in the browser when clicking on the success notification.', async () => {
        let openItem: MessageItem & Record<string, unknown>;
        let openExternal: sinon.SinonStub;

        useTextEditor(undefined);
        createUrl.resolves('http://example.com/foo/bar');

        openExternal = sinon.stub(env, 'openExternal').resolves();

        openItem = { title: STRINGS.command.openInBrowser, action: 'open' };
        showInformationMessage.resolves(openItem);

        command = new Command(finder, selector, 'commit', true, 'copy');
        await command.execute(file);

        expect(openExternal).to.have.been.calledWith(Uri.parse('http://example.com/foo/bar'));
    });

    it('should open the link in the browser without showing a notification when the command action is "open".', async () => {
        let openExternal: sinon.SinonStub;

        useTextEditor(undefined);
        createUrl.resolves('http://example.com/foo/bar');

        openExternal = sinon.stub(env, 'openExternal').resolves();

        command = new Command(finder, selector, 'commit', true, 'open');
        await command.execute(file);

        expect(showInformationMessage).to.have.not.been.called;
        expect(openExternal).to.have.been.calledWith(Uri.parse('http://example.com/foo/bar'));
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

    function expectError(message: string): void {
        expect(link, 'link').to.be.undefined;
        expect(showErrorMessage).to.have.been.calledWith(message);
    }

    function getLinkTypes(): (LinkType | undefined)[] {
        return ['commit', 'branch', 'defaultBranch', undefined];
    }
});
