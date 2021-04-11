import * as chai from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { env, MessageItem, Position, Selection, TextDocument, Uri, window } from 'vscode';

import { GetLinkCommand, GetLinkCommandOptions } from '../../src/commands/get-link-command';
import { LinkHandler } from '../../src/link-handler';
import { LinkHandlerProvider } from '../../src/link-handler-provider';
import { RepositoryFinder } from '../../src/repository-finder';
import { STRINGS } from '../../src/strings';
import { LinkType, Repository } from '../../src/types';

const expect = chai.use(sinonChai).expect;

describe('GetLinkCommand', () => {
    let showErrorMessage: sinon.SinonStub;
    let showInformationMessage: sinon.SinonStub;
    let createUrl: sinon.SinonStub;
    let finder: RepositoryFinder;
    let provider: LinkHandlerProvider;
    let handler: LinkHandler | undefined;
    let command: GetLinkCommand;
    let folder: Uri;
    let file: Uri;
    let repository: Repository | undefined;
    let link: string | undefined;

    beforeEach(() => {
        finder = new RepositoryFinder();
        sinon.stub(finder, 'findRepository').callsFake(async () => Promise.resolve(repository));

        provider = new LinkHandlerProvider();
        sinon.stub(provider, 'select').callsFake(() => handler);

        handler = new LinkHandler({
            name: 'Test',
            server: { http: 'http://example.com', ssh: 'ssh://example.com' },
            branchRef: 'abbreviated',
            url: '',
            selection: '',
            reverse: {
                pattern: '',
                file: '',
                server: { http: '', ssh: '' },
                selection: { startLine: '', endLine: '' }
            }
        });

        file = Uri.file('/foo/bar');
        folder = Uri.file('/foo');
        repository = {
            root: folder.toString(),
            remote: { url: 'http://example.com', name: 'origin' }
        };

        showErrorMessage = sinon
            .stub(window, 'showErrorMessage')
            .returns(Promise.resolve(undefined));

        showInformationMessage = sinon
            .stub(window, 'showInformationMessage')
            .returns(Promise.resolve(undefined));

        createUrl = sinon.stub(handler, 'createUrl');

        link = undefined;
        sinon.stub(env, 'clipboard').value({
            writeText: async (text: string) => {
                link = text;
                return Promise.resolve();
            }
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should show an error if the command was invoked for a resource that was not a file.', async () => {
        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(Uri.parse('http://example.com'));

        expectError(STRINGS.getLinkCommand.noFileSelected);
    });

    it('should show an error if the command was not invoked for a resource, and no file is active.', async () => {
        useTextEditor(undefined);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(undefined);

        expectError(STRINGS.getLinkCommand.noFileSelected);
    });

    it('should show an error if the file is not in a repository.', async () => {
        repository = undefined;
        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expectError(STRINGS.getLinkCommand.notTrackedByGit(file));
    });

    it('should show an error if the repository does not have a remote.', async () => {
        repository = { root: folder.toString(), remote: undefined };

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expectError(STRINGS.getLinkCommand.noRemote(folder.toString()));
    });

    it('should show an error if the repository does not have a link handler.', async () => {
        handler = undefined;

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expectError(STRINGS.getLinkCommand.noHandler(repository?.remote?.url ?? ''));
    });

    it('should use the active text editor to get the file when no resource was specified.', async () => {
        useTextEditor(file);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(undefined);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            {
                filePath: file.fsPath,
                selection: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
            },
            { type: 'commit' }
        );
    });

    it('should not include the selection when not allowed to.', async () => {
        command = createCommand({ linkType: 'commit', includeSelection: false, action: 'copy' });
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            { filePath: file.fsPath, selection: undefined },
            { type: 'commit' }
        );
    });

    it('should include the selection when allowed to and the file is in the active editor.', async () => {
        useTextEditor(file, {
            start: new Position(1, 2),
            end: new Position(3, 4)
        });

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            {
                filePath: file.fsPath,
                selection: { startLine: 2, startColumn: 3, endLine: 4, endColumn: 5 }
            },
            { type: 'commit' }
        );
    });

    it('should not include the selection when allowed to but the file is not in the active editor.', async () => {
        useTextEditor(undefined);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            { filePath: file.fsPath, selection: undefined },
            { type: 'commit' }
        );
    });

    getLinkTypes().forEach((linkType) => {
        it(`should create a link of the specified type (${linkType ?? 'undefined'}).`, async () => {
            useTextEditor(undefined);

            command = createCommand({ linkType, includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(createUrl).to.have.been.calledWithExactly(
                repository,
                { filePath: file.fsPath, selection: undefined },
                { type: linkType }
            );
        });
    });

    it('should copy the link to the clipboard when the command action is "copy".', async () => {
        useTextEditor(undefined);

        createUrl.resolves('http://example.com/foo/bar');

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(link).to.equal('http://example.com/foo/bar');
    });

    it('should show a message when the link is created when the command action is "copy".', async () => {
        useTextEditor(undefined);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(showInformationMessage).to.have.been.calledWithExactly(
            STRINGS.getLinkCommand.linkCopied(handler?.name ?? ''),
            {
                title: STRINGS.getLinkCommand.openInBrowser,
                action: 'open'
            }
        );
    });

    it('should open the link in the browser when clicking on the success notification.', async () => {
        let openItem: MessageItem & Record<string, unknown>;
        let openExternal: sinon.SinonStub;

        useTextEditor(undefined);
        createUrl.resolves('http://example.com/foo/bar');

        openExternal = sinon.stub(env, 'openExternal').resolves();

        openItem = { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' };
        showInformationMessage.resolves(openItem);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(openExternal).to.have.been.calledWith(Uri.parse('http://example.com/foo/bar'));
    });

    it('should open the link in the browser without showing a notification when the command action is "open".', async () => {
        let openExternal: sinon.SinonStub;

        useTextEditor(undefined);
        createUrl.resolves('http://example.com/foo/bar');

        openExternal = sinon.stub(env, 'openExternal').resolves();

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'open' });
        await command.execute(file);

        expect(showInformationMessage).to.have.not.been.called;
        expect(openExternal).to.have.been.calledWith(Uri.parse('http://example.com/foo/bar'));
    });

    function createCommand(options: GetLinkCommandOptions): GetLinkCommand {
        return new GetLinkCommand(finder, provider, options);
    }

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
