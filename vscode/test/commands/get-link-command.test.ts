import type {
    CancellationToken,
    MessageItem,
    QuickPickItem,
    QuickPickOptions,
    Selection,
    TextDocument
} from 'vscode';

import type { GetLinkCommandOptions } from '../../src/commands/get-link-command';
import type { Git } from '../../src/git';
import type { CreateUrlResult } from '../../src/link-handler';
import type { SelectedLinkHandler } from '../../src/link-handler-provider';
import type {
    FileInfo,
    LinkFormat,
    LinkOptions,
    LinkType,
    Repository,
    RepositoryWithRemote
} from '../../src/types';

import * as chai from 'chai';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { env, Position, Uri, window } from 'vscode';

import { GetLinkCommand } from '../../src/commands/get-link-command';
import { LinkHandler } from '../../src/link-handler';
import { LinkHandlerProvider } from '../../src/link-handler-provider';
import { RepositoryFinder } from '../../src/repository-finder';
import { Settings } from '../../src/settings';
import { STRINGS } from '../../src/strings';
import { Directory, getGitService, markAsSlow, setupRepository } from '../helpers';

const expect = chai.use(sinonChai).expect;

describe('GetLinkCommand', () => {
    let showErrorMessage: sinon.SinonStub;
    let showInformationMessage: sinon.SinonStub;
    let createUrl: sinon.SinonStub<
        [repository: RepositoryWithRemote, remoteUrl: string, file: FileInfo, options: LinkOptions],
        Promise<CreateUrlResult>
    >;
    let git: Git;
    let finder: RepositoryFinder;
    let provider: LinkHandlerProvider;
    let selectedHandler: SelectedLinkHandler | undefined;
    let command: GetLinkCommand;
    let folder: Uri;
    let file: Uri;
    let repository: Repository | undefined;
    let link: string | undefined;

    beforeEach(() => {
        git = getGitService();
        finder = new RepositoryFinder(git);
        sinon.stub(finder, 'findRepository').callsFake(() => repository);

        provider = new LinkHandlerProvider(git);
        sinon.stub(provider, 'select').callsFake(() => selectedHandler);

        selectedHandler = {
            handler: new LinkHandler(
                {
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
                },
                git
            ),
            remoteUrl: 'http://example.com'
        };

        file = Uri.file('/foo/bar');
        folder = Uri.file('/foo');
        repository = {
            root: folder,
            remote: { name: 'origin', urls: ['http://example.com'] }
        };

        showErrorMessage = sinon
            .stub(window, 'showErrorMessage')
            .returns(Promise.resolve(undefined));

        showInformationMessage = sinon
            .stub(window, 'showInformationMessage')
            .returns(Promise.resolve(undefined));

        createUrl = sinon
            .stub(selectedHandler.handler, 'createUrl')
            .resolves({ url: 'test', relativePath: 'path', selection: '' });

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
        repository = { root: folder, remote: undefined };

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expectError(STRINGS.getLinkCommand.noRemote(folder));
    });

    it('should show an error if the repository does not have a link handler.', async () => {
        selectedHandler = undefined;

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expectError(STRINGS.getLinkCommand.noHandler('http://example.com'));
    });

    it('should use the active text editor to get the file when no resource was specified.', async () => {
        useTextEditor(file);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(undefined);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            selectedHandler?.remoteUrl,
            {
                uri: file,
                selection: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 }
            },
            { target: { preset: 'commit' } }
        );
    });

    it('should not include the selection when not allowed to.', async () => {
        command = createCommand({ linkType: 'commit', includeSelection: false, action: 'copy' });
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            selectedHandler?.remoteUrl,
            { uri: file, selection: undefined },
            { target: { preset: 'commit' } }
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
            selectedHandler?.remoteUrl,
            {
                uri: file,
                selection: { startLine: 2, startColumn: 3, endLine: 4, endColumn: 5 }
            },
            { target: { preset: 'commit' } }
        );
    });

    it('should not include the selection when allowed to but the file is not in the active editor.', async () => {
        useTextEditor(undefined);

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(createUrl).to.have.been.calledWithExactly(
            repository,
            selectedHandler?.remoteUrl,
            { uri: file, selection: undefined },
            { target: { preset: 'commit' } }
        );
    });

    getLinkTypes().forEach((linkType) => {
        it(`should create a link of the specified type (${linkType ?? 'undefined'}).`, async () => {
            useTextEditor(undefined);

            command = createCommand({ linkType, includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(createUrl).to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                { target: { preset: linkType } }
            );
        });
    });

    it('should copy the link to the clipboard when the command action is "copy".', async () => {
        setLinkFormat('raw');

        useTextEditor(undefined);

        createUrl.resolves({
            url: 'http://example.com/foo/bar',
            relativePath: '/foo/bar',
            selection: ''
        });

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(link).to.equal('http://example.com/foo/bar');
    });

    it('should format the copied link as markdown when the link format is "markdown".', async () => {
        setLinkFormat('markdown');

        useTextEditor(file, {
            start: new Position(1, 2),
            end: new Position(3, 4)
        });

        createUrl.resolves({
            url: 'http://example.com/foo/bar',
            relativePath: '/foo/bar',
            selection: '#L1-3'
        });

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(link).to.equal('[/foo/bar#L1-3](http://example.com/foo/bar)');
    });

    it('should format the copied link as markdown without a code block when the link format is "markdownWithPreview" but the link should not include the selection.', async () => {
        setLinkFormat('markdownWithPreview');

        useTextEditor(
            file,
            undefined,
            ['first\n', ' second\n', '  third\n', '   fourth\n', '    fifth\n', '     sixth\n'],
            'javascript'
        );

        createUrl.resolves({
            url: 'http://example.com/foo/bar',
            relativePath: '/foo/bar',
            selection: ''
        });

        command = createCommand({ linkType: 'commit', includeSelection: false, action: 'copy' });
        await command.execute(file);

        expect(link).to.equal('[/foo/bar](http://example.com/foo/bar)');
    });

    it('should format the copied link as markdown and include a code block when the link format is "markdownWithPreview".', async () => {
        setLinkFormat('markdownWithPreview');

        useTextEditor(
            file,
            {
                start: new Position(1, 2),
                end: new Position(3, 4)
            },
            ['first\n', ' second\n', '  third\n', '   fourth\n', '    fifth\n', '     sixth\n'],
            'javascript'
        );

        createUrl.resolves({
            url: 'http://example.com/foo/bar',
            relativePath: '/foo/bar',
            selection: '#L2-4'
        });

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
        await command.execute(file);

        expect(link).to.equal(
            [
                '[/foo/bar#L2-4](http://example.com/foo/bar)',
                '```javascript',
                ' second',
                '  third',
                '   fourth',
                '```'
            ].join('\n')
        );
    });

    it('should open the link in the browser without showing a notification when the command action is "open".', async () => {
        let openExternal: sinon.SinonStub;

        useTextEditor(undefined);
        createUrl.resolves({
            url: 'http://example.com/foo/bar',
            relativePath: '/foo/bar',
            selection: '#L1-3'
        });

        openExternal = sinon.stub(env, 'openExternal').resolves();

        command = createCommand({ linkType: 'commit', includeSelection: true, action: 'open' });
        await command.execute(file);

        expect(showInformationMessage).to.have.not.been.called;
        // Should be called with a string instead of a Uri because of https://github.com/microsoft/vscode/issues/85930
        expect(openExternal).to.have.been.calledWith('http://example.com/foo/bar');
    });

    describe('success notification', () => {
        it('should show a message when the link is created when the command action is "copy".', async () => {
            useTextEditor(undefined);

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWith(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? '')
            );
        });

        it('should show the correct actions when a raw url is copied with a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('raw');

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsMarkdownLink, action: 'copy-markdown' },
                {
                    title: STRINGS.getLinkCommand.copyAsMarkdownLinkWithPreview,
                    action: 'copy-markdown-with-preview'
                }
            );
        });

        it('should show the correct actions when a raw url is copied without a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('raw');

            command = createCommand({
                linkType: 'commit',
                includeSelection: false,
                action: 'copy'
            });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsMarkdownLink, action: 'copy-markdown' }
            );
        });

        it('should show the correct actions when a markdown link is copied with a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('markdown');

            command = createCommand({
                linkType: 'commit',
                includeSelection: true,
                action: 'copy'
            });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsRawUrl, action: 'copy-raw' },
                {
                    title: STRINGS.getLinkCommand.copyAsMarkdownLinkWithPreview,
                    action: 'copy-markdown-with-preview'
                }
            );
        });

        it('should show the correct actions when a markdown link is copied without a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('markdown');

            command = createCommand({
                linkType: 'commit',
                includeSelection: false,
                action: 'copy'
            });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsRawUrl, action: 'copy-raw' }
            );
        });

        it('should show the correct actions when a markdown link with a preview is copied with a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('markdownWithPreview');

            command = createCommand({
                linkType: 'commit',
                includeSelection: true,
                action: 'copy'
            });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsRawUrl, action: 'copy-raw' },
                {
                    title: STRINGS.getLinkCommand.copyAsMarkdownLinkWithoutPreview,
                    action: 'copy-markdown'
                }
            );
        });

        it('should show the correct actions when a markdown link with a preview is copied without a selection.', async () => {
            useTextEditor(file);
            setLinkFormat('markdownWithPreview');

            command = createCommand({
                linkType: 'commit',
                includeSelection: false,
                action: 'copy'
            });
            await command.execute(file);

            expect(showInformationMessage).to.have.been.calledWithExactly(
                STRINGS.getLinkCommand.linkCopied(selectedHandler?.handler?.name ?? ''),
                { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' },
                { title: STRINGS.getLinkCommand.copyAsRawUrl, action: 'copy-raw' }
            );
        });

        it('should copy the raw link when clicking the "copy raw url" button.', async () => {
            useTextEditor(file);
            setLinkFormat('markdown');
            createUrl.resolves({
                url: 'http://example.com/foo/bar',
                relativePath: '/foo/bar',
                selection: '#L1-3'
            });

            showInformationMessage.resolves({ action: 'copy-raw' });

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(link).to.equal('http://example.com/foo/bar');
        });

        it('should copy the raw link when clicking the "copy markdown" button.', async () => {
            useTextEditor(file);
            setLinkFormat('raw');
            createUrl.resolves({
                url: 'http://example.com/foo/bar',
                relativePath: '/foo/bar',
                selection: '#L1-3'
            });

            showInformationMessage.resolves({ action: 'copy-markdown' });

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(link).to.equal('[/foo/bar#L1-3](http://example.com/foo/bar)');
        });

        it('should copy the raw link when clicking the "copy markdown with preview" button.', async () => {
            useTextEditor(
                file,
                { start: new Position(1, 2), end: new Position(2, 3) },
                ['one\n', 'two\n', 'three\n', 'four\n'],
                'javascript'
            );
            setLinkFormat('raw');
            createUrl.resolves({
                url: 'http://example.com/foo/bar',
                relativePath: '/foo/bar',
                selection: '#L1-3'
            });

            showInformationMessage.resolves({ action: 'copy-markdown-with-preview' });

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            expect(link).to.equal(
                [
                    '[/foo/bar#L1-3](http://example.com/foo/bar)',
                    '```javascript',
                    'two',
                    'three',
                    '```'
                ].join('\n')
            );
        });

        it('should open the link in the browser when clicking the "open" button.', async () => {
            let openItem: MessageItem & Record<string, unknown>;
            let openExternal: sinon.SinonStub;

            useTextEditor(undefined);
            createUrl.resolves({
                url: 'http://example.com/foo/bar',
                relativePath: '/foo/bar',
                selection: '#L1-3'
            });

            openExternal = sinon.stub(env, 'openExternal').resolves();

            openItem = { title: STRINGS.getLinkCommand.openInBrowser, action: 'open' };
            showInformationMessage.resolves(openItem);

            command = createCommand({ linkType: 'commit', includeSelection: true, action: 'copy' });
            await command.execute(file);

            // Should be called with a string instead of a Uri because of https://github.com/microsoft/vscode/issues/85930
            expect(openExternal).to.have.been.calledWith('http://example.com/foo/bar');
        });
    });

    describe('prompt', function () {
        let root: Directory;
        let commits: Ref[];
        let showQuickPick: sinon.SinonStub<
            [
                items: readonly QuickPickItem[] | Thenable<readonly QuickPickItem[]>,
                options?: QuickPickOptions | undefined,
                token?: CancellationToken | undefined
            ],
            Thenable<QuickPickItem | undefined>
        >;

        // We need to create repositories, so mark the
        // tests as being a bit slower than other tests.
        markAsSlow(this);

        before(async () => {
            root = await Directory.create();
            commits = [];

            await setupRepository(root.path);

            await fs.writeFile(path.join(root.path, '0'), '');
            await git.exec(root.path, 'add', '*');
            await git.exec(root.path, 'commit', '-m', '0');
            commits.push(await getRef());

            await git.exec(root.path, 'checkout', '-b', 'first');
            await fs.writeFile(path.join(root.path, '1'), '');
            await git.exec(root.path, 'add', '*');
            await git.exec(root.path, 'commit', '-m', '1');
            commits.push(await getRef());

            await git.exec(root.path, 'checkout', '-b', 'second');
            await fs.writeFile(path.join(root.path, '2'), '');
            await git.exec(root.path, 'add', '*');
            await git.exec(root.path, 'commit', '-m', '2');
            commits.push(await getRef());

            commits.sort((x, y) => x.abbreviated.localeCompare(y.abbreviated));
        });

        beforeEach(() => {
            command = createCommand({
                linkType: 'prompt',
                includeSelection: false,
                action: 'copy'
            });

            repository = {
                root: root.uri,
                remote: { name: 'origin', urls: ['http://example.com'] }
            };

            showQuickPick = sinon.stub(window, 'showQuickPick');
        });

        after(async () => {
            await root.dispose();
        });

        it('should not create a link when the prompt is cancelled.', async () => {
            showQuickPick.resolves(undefined);

            await command.execute(file);

            expect(createUrl).to.have.not.been.called;
        });

        getLinkTypes()
            .filter((x): x is LinkType => x !== undefined)
            .forEach((type) => {
                it(`should show the default preset first when the default is '${type}'.`, async () => {
                    sinon.stub(Settings.prototype, 'getDefaultLinkType').returns(type);

                    showQuickPick.callsFake(async (items) => (await items)[0]);

                    await command.execute(file);

                    expect(createUrl).to.have.been.calledWithExactly(
                        repository,
                        selectedHandler?.remoteUrl,
                        { uri: file, selection: undefined },
                        { target: { preset: type } }
                    );
                });
            });

        it(`should use the selected branch.`, async () => {
            showQuickPick.callsFake(async (items) => (await items)[5]);
            await command.execute(file);

            expect(createUrl, 'branch #1').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                {
                    target: {
                        ref: { abbreviated: 'first', symbolic: 'refs/heads/first' },
                        type: 'branch'
                    }
                }
            );

            showQuickPick.callsFake(async (items) => (await items)[6]);
            await command.execute(file);

            expect(createUrl, 'branch #2').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                {
                    target: {
                        ref: { abbreviated: 'master', symbolic: 'refs/heads/master' },
                        type: 'branch'
                    }
                }
            );

            showQuickPick.callsFake(async (items) => (await items)[7]);
            await command.execute(file);

            expect(createUrl, 'branch #3').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                {
                    target: {
                        ref: { abbreviated: 'second', symbolic: 'refs/heads/second' },
                        type: 'branch'
                    }
                }
            );
        });

        it(`should use the selected commit.`, async () => {
            showQuickPick.callsFake(async (items) => (await items)[10]);
            await command.execute(file);

            expect(createUrl, 'commit #1').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                { target: { ref: commits[0], type: 'commit' } }
            );

            showQuickPick.callsFake(async (items) => (await items)[11]);
            await command.execute(file);

            expect(createUrl, 'commit #2').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                { target: { ref: commits[1], type: 'commit' } }
            );

            showQuickPick.callsFake(async (items) => (await items)[12]);
            await command.execute(file);

            expect(createUrl, 'commit #3').to.have.been.calledWithExactly(
                repository,
                selectedHandler?.remoteUrl,
                { uri: file, selection: undefined },
                { target: { ref: commits[2], type: 'commit' } }
            );
        });

        async function getRef(): Promise<Ref> {
            return {
                abbreviated: (await git.exec(root.path, 'rev-parse', '--short', 'HEAD')).trim(),
                symbolic: (await git.exec(root.path, 'rev-parse', 'HEAD')).trim()
            };
        }

        interface Ref {
            abbreviated: string;
            symbolic: string;
        }
    });

    function createCommand(options: GetLinkCommandOptions): GetLinkCommand {
        return new GetLinkCommand(finder, provider, git, options);
    }

    function useTextEditor(
        uri: Uri | undefined,
        selection?: Pick<Selection, 'end' | 'start'>,
        lines?: string[],
        languageId?: string
    ): void {
        if (!selection) {
            selection = { start: new Position(0, 0), end: new Position(0, 0) };
        }

        sinon.stub(window, 'activeTextEditor').value(
            uri
                ? {
                      document: {
                          uri,
                          getText: (range) =>
                              (lines ?? []).slice(range?.start.line, range?.end.line ?? 0).join(''),
                          languageId: languageId ?? 'text'
                      } as TextDocument,
                      selection
                  }
                : undefined
        );
    }

    function setLinkFormat(format: LinkFormat): void {
        sinon.stub(Settings.prototype, 'getLinkFormat').returns(format);
    }

    function expectError(message: string): void {
        expect(link, 'link').to.be.undefined;
        expect(showErrorMessage).to.have.been.calledWith(message);
    }

    function getLinkTypes(): (LinkType | undefined)[] {
        return ['commit', 'branch', 'defaultBranch', 'tag', undefined];
    }
});
