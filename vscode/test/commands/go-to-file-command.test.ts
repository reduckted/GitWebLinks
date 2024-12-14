import type { InputBoxOptions, TextDocument, TextEditor, TextLine } from 'vscode';

import type { Git } from '../../src/git';
import type { Repository, SelectedRange, UrlInfo } from '../../src/types';

import * as chai from 'chai';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { commands, env, Position, Range, Selection, Uri, window, workspace } from 'vscode';

import { GoToFileCommand } from '../../src/commands/go-to-file-command';
import { LinkHandlerProvider } from '../../src/link-handler-provider';
import { RepositoryFinder } from '../../src/repository-finder';
import { STRINGS } from '../../src/strings';
import { toSelection } from '../../src/utilities';
import { Directory, getGitService, matchUri } from '../helpers';

const expect = chai.use(sinonChai).expect;

describe('GoToFileLinkCommand', () => {
    let showErrorMessage: sinon.SinonStub;
    let showInputBox: sinon.SinonStub;
    let showQuickPick: sinon.SinonStub;
    let openTextDocument: sinon.SinonStub;
    let finder: RepositoryFinder;
    let provider: LinkHandlerProvider;
    let command: GoToFileCommand;
    let input: string | undefined;
    let clipboard: string;
    let urlInfo: UrlInfo[];
    let repositories: Repository[];
    let root: Directory;
    let selectionIndex: number;
    let document: TextDocument;
    let editor: TextEditor;
    let revealRange: sinon.SinonStub;
    let lines: TextLine[];

    beforeEach(() => {
        let git: Git;

        git = getGitService();

        repositories = [];
        finder = new RepositoryFinder(git);
        sinon.stub(finder, 'getAllRepositories').callsFake(() => repositories);

        urlInfo = [];
        provider = new LinkHandlerProvider(git);
        sinon.stub(provider, 'getUrlInfo').callsFake(() => urlInfo);

        showErrorMessage = sinon
            .stub(window, 'showErrorMessage')
            .returns(Promise.resolve(undefined));

        input = undefined;
        showInputBox = sinon
            .stub(window, 'showInputBox')
            .callsFake(async () => Promise.resolve(input));

        selectionIndex = -1;
        showQuickPick = sinon.stub(window, 'showQuickPick').callsFake(async (items) => {
            if ('then' in items) {
                items = await items;
            }

            return selectionIndex >= 0 ? items[selectionIndex] : undefined;
        });

        lines = [];
        document = {
            get lineCount(): number {
                return lines.length;
            },
            lineAt: (index: number) => lines[index]
        } as unknown as TextDocument;

        editor = { revealRange: () => undefined } as unknown as TextEditor;
        revealRange = sinon.stub(editor, 'revealRange');

        openTextDocument = sinon.stub(workspace, 'openTextDocument').resolves(document);

        sinon.stub(window, 'showTextDocument').resolves(editor);

        clipboard = '';
        sinon.stub(env, 'clipboard').value({ readText: async () => Promise.resolve(clipboard) });

        command = new GoToFileCommand(finder, provider);
    });

    afterEach(async () => {
        sinon.restore();
        await root?.dispose();
    });

    describe('URL input', () => {
        it('should not use the clipboard text as the initial value when prompting for a URL when the clipboard text is not a URL.', async () => {
            input = '';
            clipboard = 'foo';

            await command.execute();

            expect(showInputBox).to.have.been.calledWith(sinon.match({ value: undefined }));
        });

        it('should use the clipboard text as the initial value when prompting for a URL when the clipboard text is a URL.', async () => {
            input = '';
            clipboard = 'http://example.com';

            await command.execute();

            expect(showInputBox).to.have.been.calledWith(
                sinon.match({ value: 'http://example.com' })
            );
        });

        it('should validate input as a URL.', async () => {
            let options: InputBoxOptions;

            input = '';
            clipboard = 'http://example.com';

            await command.execute();

            options = showInputBox.firstCall.args[0] as InputBoxOptions;
            expect(options).to.exist;
            expect(options.validateInput).to.exist; // eslint-disable-line @typescript-eslint/unbound-method

            if (options.validateInput) {
                expect(options.validateInput('http://example.com')).to.be.undefined;
                expect(options.validateInput('https://example.com')).to.be.undefined;

                expect(options.validateInput('')).to.equal(STRINGS.goToFileCommand.invalidUrl);
                expect(options.validateInput('http')).to.equal(STRINGS.goToFileCommand.invalidUrl);
                expect(options.validateInput('example.com')).to.equal(
                    STRINGS.goToFileCommand.invalidUrl
                );
            }
        });
    });

    describe('File Selection', () => {
        beforeEach(() => {
            input = 'http://example.com';
        });

        it('should show an error message when the URL is unknown.', async () => {
            urlInfo = [];

            await command.execute();

            expectError(STRINGS.goToFileCommand.unknownUrl);
        });

        it('should show an error when there are no repositories.', async () => {
            urlInfo = [createUrlInfo('readme.md', 'http://example.com')];
            repositories = [];

            await command.execute();

            expectError(STRINGS.goToFileCommand.noFilesFound);
        });

        it('should show an error when the file does not exist in the matching repository.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: {}
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com')];

            await command.execute();

            expectError(STRINGS.goToFileCommand.noFilesFound);
        });

        it('should show an error if the URL points to a directory.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { dir: { children: {} } }
            });

            urlInfo = [createUrlInfo('dir', 'http://example.com')];

            await command.execute();

            expectError(STRINGS.goToFileCommand.noFilesFound);
        });

        it('should open the single file that matches the URL.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com')];

            await command.execute();

            expectFiles(Uri.joinPath(root.uri, 'readme.md'));
        });

        it('should not prompt to select a file when the file exists in multiple repositories, but one repository matches the remote.', async () => {
            await setupFileSystem({
                children: {
                    alpha: {
                        repository: 'http://example.com/alpha',
                        children: { 'readme.md': 'file' }
                    },
                    beta: {
                        repository: 'http://example.com/beta',
                        children: { 'readme.md': 'file' }
                    }
                }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com/alpha')];

            await command.execute();

            expectFiles(Uri.joinPath(root.uri, 'alpha/readme.md'));
        });

        it('should prompt to select a file when the file exists in multiple repositories and no repository matches the remote.', async () => {
            await setupFileSystem({
                children: {
                    alpha: {
                        repository: 'http://example.com/alpha',
                        children: { 'readme.md': 'file' }
                    },
                    beta: {
                        repository: 'http://example.com/beta',
                        children: { 'readme.md': 'file' }
                    }
                }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com/other')];

            await command.execute();

            expectFiles(
                Uri.joinPath(root.uri, 'alpha/readme.md'),
                Uri.joinPath(root.uri, 'beta/readme.md')
            );
        });

        it('should not prompt to select a file when the file exists in multiple repositories but under different paths.', async () => {
            await setupFileSystem({
                children: {
                    alpha: {
                        repository: 'http://example.com/alpha',
                        children: {
                            docs: {
                                children: { 'readme.md': 'file' }
                            }
                        }
                    },
                    beta: {
                        repository: 'http://example.com/beta',
                        children: { 'readme.md': 'file' }
                    }
                }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com/other')];

            await command.execute();

            expectFiles(Uri.joinPath(root.uri, 'beta/readme.md'));
        });

        it('should find the file when there are multiple repositories and none match the remote, but the file is in only one repository.', async () => {
            await setupFileSystem({
                children: {
                    alpha: {
                        repository: 'http://example.com/alpha',
                        children: { 'one.md': 'file' }
                    },
                    beta: {
                        repository: 'http://example.com/beta',
                        children: { 'two.md': 'file' }
                    }
                }
            });

            urlInfo = [createUrlInfo('two.md', 'http://example.com/other')];

            await command.execute();

            expectFiles(Uri.joinPath(root.uri, 'beta/two.md'));
        });

        it('should open the selected file as a text document.', async () => {
            await setupFileSystem({
                children: {
                    alpha: {
                        repository: 'http://example.com/alpha',
                        children: { 'readme.md': 'file' }
                    },
                    beta: {
                        repository: 'http://example.com/beta',
                        children: { 'readme.md': 'file' }
                    },
                    gamma: {
                        repository: 'http://example.com/gamma',
                        children: { 'readme.md': 'file' }
                    }
                }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com/other')];

            selectionIndex = 1;
            await command.execute();

            expect(openTextDocument).to.have.been.calledOnceWithExactly(
                matchUri(Uri.joinPath(root.uri, 'beta/readme.md'))
            );
        });

        it('should open the file via a command when it cannot be opened as a text document.', async () => {
            let executeCommand: sinon.SinonStub;

            await setupFileSystem({
                repository: 'http://example.com/alpha',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com/alpha')];

            openTextDocument.rejects(new Error('Not a text document'));
            executeCommand = sinon.stub(commands, 'executeCommand').resolves();

            await command.execute();

            expect(openTextDocument).to.have.been.calledOnceWithExactly(
                matchUri(Uri.joinPath(root.uri, 'readme.md'))
            );

            expect(executeCommand).to.have.been.calledOnceWithExactly(
                'vscode.open',
                matchUri(Uri.joinPath(root.uri, 'readme.md'))
            );
        });
    });

    describe('Selection Highlighting', () => {
        beforeEach(() => {
            input = 'http://example.com';
        });

        it('should not change the selection if the URL does not include a selection range.', async () => {
            let selection: Selection;

            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [createUrlInfo('readme.md', 'http://example.com')];

            selection = new Selection(new Position(1, 2), new Position(3, 4));
            editor.selection = selection;

            await command.execute();

            expectFiles(Uri.joinPath(root.uri, 'readme.md'));
            expect(editor.selection).to.deep.equal(selection);
        });

        it('should create the correct selection when the URL only contains a start line.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [
                createUrlInfo('readme.md', 'http://example.com', undefined, {
                    startLine: 2,
                    startColumn: undefined,
                    endLine: undefined,
                    endColumn: undefined
                })
            ];

            setupDocument('First', 'Second', 'Third', 'Fourth');

            await command.execute();

            expect(editor.selection).to.deep.equal(
                toSelection({
                    startLine: 2,
                    startColumn: 1,
                    endLine: 2,
                    endColumn: 7
                })
            );
        });

        it('should create the correct selection when the URL only contains a start line and end line.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [
                createUrlInfo('readme.md', 'http://example.com', undefined, {
                    startLine: 2,
                    startColumn: undefined,
                    endLine: 3,
                    endColumn: undefined
                })
            ];

            setupDocument('First', 'Second', 'Third', 'Fourth');

            await command.execute();

            expect(editor.selection).to.deep.equal(
                toSelection({
                    startLine: 2,
                    startColumn: 1,
                    endLine: 3,
                    endColumn: 6
                })
            );
        });

        it('should create the correct selection when the URL only contains a start line, start column and end column.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [
                createUrlInfo('readme.md', 'http://example.com', undefined, {
                    startLine: 2,
                    startColumn: 3,
                    endColumn: 5
                })
            ];

            setupDocument('First', 'Second', 'Third', 'Fourth');

            await command.execute();

            expect(editor.selection).to.deep.equal(
                toSelection({
                    startLine: 2,
                    startColumn: 3,
                    endLine: 2,
                    endColumn: 5
                })
            );
        });

        it('should create the correct selection when the URL contains a start line, start column, end line and end column.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [
                createUrlInfo('readme.md', 'http://example.com', undefined, {
                    startLine: 2,
                    startColumn: 4,
                    endLine: 3,
                    endColumn: 5
                })
            ];

            setupDocument('First', 'Second', 'Third', 'Fourth');

            await command.execute();

            expect(editor.selection).to.deep.equal(
                toSelection({
                    startLine: 2,
                    startColumn: 4,
                    endLine: 3,
                    endColumn: 5
                })
            );
        });

        it('should scroll to the selected range.', async () => {
            await setupFileSystem({
                repository: 'http://example.com/repo',
                children: { 'readme.md': 'file' }
            });

            urlInfo = [
                createUrlInfo('readme.md', 'http://example.com', undefined, {
                    startLine: 1,
                    startColumn: 2,
                    endLine: 3,
                    endColumn: 4
                })
            ];

            setupDocument('First', 'Second', 'Third', 'Fourth');

            await command.execute();

            expect(revealRange).to.have.been.calledOnceWithExactly(
                toSelection({
                    startLine: 1,
                    startColumn: 2,
                    endLine: 3,
                    endColumn: 4
                })
            );
        });
    });

    async function setupFileSystem(folder: Folder): Promise<void> {
        root = await Directory.create();
        await setupFolder(folder, root.path);
    }

    async function setupFolder(folder: Folder, path: string): Promise<void> {
        if (folder.repository) {
            repositories.push({
                root: Uri.file(path),
                remote: { name: 'origin', urls: [folder.repository] }
            });
        }

        for (let name in folder.children) {
            let childFolder: 'file' | Folder;
            let childPath: string;

            childFolder = folder.children[name];
            childPath = join(path, name);

            if (childFolder === 'file') {
                await fs.writeFile(childPath, '');
            } else {
                await fs.mkdir(childPath, { recursive: true });
                await setupFolder(childFolder, childPath);
            }
        }
    }

    function setupDocument(...content: string[]): void {
        lines = content.map((line, index) => ({
            text: line,
            lineNumber: index,
            range: new Range(new Position(index, 0), new Position(index, line.length)),
            rangeIncludingLineBreak: new Range(new Position(index, 0), new Position(index + 1, 0)),
            firstNonWhitespaceCharacterIndex: 0,
            isEmptyOrWhitespace: false
        }));
    }

    function createUrlInfo(
        filePath: string,
        http: string,
        ssh?: string,
        selection?: Partial<SelectedRange>
    ): UrlInfo {
        return {
            filePath,
            server: { http, ssh },
            selection: selection ?? {
                startLine: undefined,
                startColumn: undefined,
                endLine: undefined,
                endColumn: undefined
            }
        };
    }

    function expectError(message: string): void {
        expect(showErrorMessage).to.have.been.calledWith(message);
    }

    function expectFiles(...fileNames: Uri[]): void {
        switch (fileNames.length) {
            case 0:
                expect(showQuickPick).to.have.not.been.called;
                expect(openTextDocument).to.have.not.been.called;
                break;

            case 1:
                expect(showQuickPick).to.have.not.been.called;
                expect(openTextDocument).to.have.been.calledOnceWithExactly(matchUri(fileNames[0]));
                break;

            default:
                expect(showQuickPick).to.have.been.calledOnceWith(
                    fileNames.map((x) => sinon.match({ label: x.fsPath }))
                );
                break;
        }
    }

    interface Folder {
        repository?: string;

        children: Record<string, 'file' | Folder>;
    }
});
