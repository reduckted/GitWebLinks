import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { Uri, workspace } from 'vscode';

import { git } from '../src/git';
import { LinkHandler } from '../src/link-handler';
import { LinkHandlerProvider } from '../src/link-handler-provider';
import { load, Template } from '../src/schema';
import { parseTemplate } from '../src/templates';
import { LinkOptions, RepositoryWithRemote, SelectedRange, UrlInfo } from '../src/types';
import { normalizeUrl } from '../src/utilities';

import { Directory, markAsSlow, setupRepository } from './helpers';
import {
    HandlerWithTests,
    RemoteUrlTests,
    SelectionTests,
    TestSettings,
    UrlTest,
    UrlTests
} from './test-schema';

const TEST_FILE_NAME: string = 'src/file.txt';
const TEST_FILE_NAME_WITH_SPACES: string = 'src/path spaces/file spaces.txt';
const TEST_BRANCH_NAME: string = 'feature/test';

let definitions: HandlerWithTests[];

definitions = load<HandlerWithTests>().sort();

describe('Link handlers', function () {
    let provider: LinkHandlerProvider;
    let root: Directory;

    // We need to create repositories, so mark the
    // tests as being a bit slower than other tests.
    markAsSlow(this);

    before(() => {
        provider = new LinkHandlerProvider();
    });

    beforeEach(async () => {
        root = await Directory.create();
        await setupRepository(root.path);
    });

    afterEach(async () => {
        sinon.restore();
        await root.dispose();
    });

    definitions.forEach((definition) => {
        describe(definition.name, () => {
            describe('createUrl', () => {
                it('http', async () => {
                    await runRemoteTest('http');
                });

                it('http with username', async () => {
                    await runRemoteTest('httpWithUsername');
                });

                it('ssh', async () => {
                    await runRemoteTest('ssh');
                });

                it('ssh with protocol', async () => {
                    await runRemoteTest('sshWithProtocol');
                });

                it('spaces', async () => {
                    await runUrlTest('spaces', { fileName: TEST_FILE_NAME_WITH_SPACES });
                });

                it('branch', async () => {
                    await runUrlTest('branch', { type: 'branch', branch: TEST_BRANCH_NAME });
                });

                it('commit', async () => {
                    await runUrlTest('commit', { type: 'commit' });
                });

                definition.tests.createUrl.misc?.forEach((test) => {
                    it(test.name, async () => {
                        await runTest(
                            {
                                settings: test.settings,
                                remote: test.remote,
                                result: test.result
                            },
                            test
                        );
                    });
                });

                it('zero-width selection', async () => {
                    await runSelectionTest('point', (test) => ({
                        startLine: test.line,
                        startColumn: 1,
                        endLine: test.line,
                        endColumn: 1
                    }));
                });

                it('single-line selection', async () => {
                    await runSelectionTest('singleLine', (test) => ({
                        startLine: test.line,
                        startColumn: test.startColumn,
                        endLine: test.line,
                        endColumn: test.endColumn
                    }));
                });

                it('multi-line selection', async () => {
                    await runSelectionTest('multipleLines', (test) => ({
                        startLine: test.startLine,
                        startColumn: test.startColumn,
                        endLine: test.endLine,
                        endColumn: test.endColumn
                    }));
                });

                async function runRemoteTest(name: RemoteTestName): Promise<void> {
                    await runTest({
                        settings: definition.tests.createUrl.remotes.settings,
                        remote: definition.tests.createUrl.remotes[name],
                        result: definition.tests.createUrl.remotes.result
                    });
                }

                async function runUrlTest(
                    name: UrlTestName,
                    options: TestOptions = {}
                ): Promise<void> {
                    await runTest(definition.tests.createUrl[name], options);
                }

                async function runSelectionTest<T extends SelectionTestName>(
                    name: T,
                    selection: (test: SelectionTests[T]) => SelectedRange
                ): Promise<void> {
                    let test: SelectionTests[T];

                    test = definition.tests.createUrl.selection[name];

                    await runTest(
                        {
                            settings: definition.tests.createUrl.selection.settings,
                            remote: definition.tests.createUrl.selection.remote,
                            result: test.result
                        },
                        { selection: selection(test) }
                    );
                }

                async function runTest(
                    { remote, result, settings }: UrlTest,
                    options: TestOptions = {}
                ): Promise<void> {
                    let repository: RepositoryWithRemote;
                    let handler: LinkHandler | undefined;
                    let link: string | undefined;

                    result = await prepareTest(settings, result, options);

                    repository = {
                        root: root.path,
                        remote
                    };

                    handler = provider.select(repository);

                    expect(handler, 'A handler was not found').to.exist;
                    expect(handler?.name).to.equal(definition.name);

                    link = await handler?.createUrl(
                        repository,
                        {
                            filePath: Uri.file(
                                path.join(root.path, options.fileName || TEST_FILE_NAME)
                            ).fsPath,
                            selection: options.selection
                        },
                        { type: options.type || 'branch' }
                    );

                    expect(link, 'Link does not match the expected result').to.equal(result);
                }

                interface TestOptions extends Partial<LinkOptions> {
                    fileName?: string;
                    branch?: string;
                    selection?: SelectedRange;
                }
            });

            describe('getUrlInfo', () => {
                it('http', async () => {
                    // The remote URL is only used to verify the result,
                    // and is normalized before comparison, so we'll only use
                    // the normal HTTP URL and not the one with the username in it.
                    await runTest({
                        settings: definition.tests.createUrl.remotes.settings,
                        remote: definition.tests.createUrl.remotes.http,
                        result: definition.tests.createUrl.remotes.result
                    });
                });

                it('ssh', async () => {
                    // The remote URL is only used to verify the result,
                    // and is normalized before comparison, so we'll only use
                    // the normal SSH URL and not the one with the protocol in it.
                    await runTest({
                        settings: definition.tests.createUrl.remotes.settings,
                        remote: definition.tests.createUrl.remotes.ssh,
                        result: definition.tests.createUrl.remotes.result
                    });
                });

                it('spaces', async () => {
                    await runUrlTest('spaces', { fileName: TEST_FILE_NAME_WITH_SPACES });
                });

                it('branch', async () => {
                    await runUrlTest('branch', {
                        type: 'branch',
                        branch: TEST_BRANCH_NAME,
                        fileMayStartWithBranch: definition.reverse?.fileMayStartWithBranch
                    });
                });

                it('commit', async () => {
                    await runUrlTest('commit', { type: 'commit' });
                });

                definition.tests.createUrl.misc?.forEach((test) => {
                    it(test.name, async () => {
                        await runTest(
                            {
                                settings: test.settings,
                                remote: test.remote,
                                result: test.result
                            },
                            test
                        );
                    });
                });

                it('zero-width selection', async () => {
                    await runSelectionTest('point', (test) => ({
                        startLine: test.line,
                        ...test.reverseRange
                    }));
                });

                it('single-line selection', async () => {
                    await runSelectionTest('singleLine', (test) => ({
                        startLine: test.line,
                        ...test.reverseRange
                    }));
                });

                it('multi-line selection', async () => {
                    await runSelectionTest('multipleLines', (test) => ({
                        startLine: test.startLine,
                        endLine: test.endLine,
                        ...test.reverseRange
                    }));
                });

                async function runUrlTest(
                    name: UrlTestName,
                    options: ReverseTestOptions = {}
                ): Promise<void> {
                    await runTest(definition.tests.createUrl[name], options);
                }

                async function runSelectionTest<T extends SelectionTestName>(
                    name: T,
                    selection: (test: SelectionTests[T]) => Partial<SelectedRange>
                ): Promise<void> {
                    let test: SelectionTests[T];

                    test = definition.tests.createUrl.selection[name];

                    await runTest(
                        {
                            settings: definition.tests.createUrl.selection.settings,
                            remote: definition.tests.createUrl.selection.remote,
                            result: test.result
                        },
                        { selection: selection(test) }
                    );
                }

                async function runTest(
                    { remote, result: url, settings }: UrlTest,
                    options: ReverseTestOptions = {}
                ): Promise<void> {
                    let infos: UrlInfo[];
                    let info: UrlInfo;

                    if (!options.fileName) {
                        options.fileName = TEST_FILE_NAME;
                    }

                    url = await prepareTest(settings, url, options);

                    infos = provider.getUrlInfo(url);

                    expect(infos).to.have.lengthOf(1);
                    info = infos[0];

                    if (info.filePath !== options.fileName) {
                        // If the file name can start with the branch
                        // name, then verify that the file name at
                        // least ends with the expected file name.
                        if (options.fileMayStartWithBranch) {
                            expect(info.filePath.endsWith(`/${options.fileName}`)).to.be.true;
                        } else {
                            expect(info.filePath).to.equal(options.fileName);
                        }
                    }

                    if (remote.startsWith('http')) {
                        expect(normalizeUrl(remote)).to.equal(normalizeUrl(info.server.http));
                    } else if (info.server.ssh) {
                        expect(normalizeUrl(remote)).to.equal(normalizeUrl(info.server.ssh));
                    }

                    if (options.selection) {
                        expect(info.selection).to.deep.equal({
                            startLine: undefined,
                            endLine: undefined,
                            startColumn: undefined,
                            endColumn: undefined,
                            ...options.selection
                        });
                    } else {
                        expect(info.selection).to.deep.equal({
                            startLine: undefined,
                            endLine: undefined,
                            startColumn: undefined,
                            endColumn: undefined
                        });
                    }
                }

                interface ReverseTestOptions extends Partial<LinkOptions> {
                    fileName?: string;
                    fileMayStartWithBranch?: boolean;
                    branch?: string;
                    selection?: Partial<SelectedRange>;
                }
            });

            async function prepareTest(
                settings: TestSettings | undefined,
                url: Template,
                options: { branch?: string }
            ): Promise<string> {
                setupSettings(settings);

                if (options.branch) {
                    await git(root.path, 'checkout', '-b', options.branch);
                }

                // Treat the test URL as a template and allow
                // the current commit hash to be used in the result.
                return parseTemplate(url).render({
                    commit: (await git(root.path, 'rev-parse', 'HEAD')).trim()
                });
            }

            function setupSettings(settings: TestSettings | undefined): void {
                let data: TestSettings;

                data = {
                    ...definition.tests.settings,
                    ...(settings ?? {})
                };

                sinon
                    .stub(workspace, 'getConfiguration')
                    .withArgs('gitweblinks')
                    .returns({
                        get: (section: string) => data[section],
                        has: () => true,
                        inspect: () => undefined,
                        update: async () => Promise.resolve()
                    });
            }

            type RemoteTestName = keyof Omit<RemoteUrlTests, 'result' | 'settings'>;
            type UrlTestName = keyof Omit<UrlTests, 'misc' | 'selection' | 'remotes'>;
            type SelectionTestName = keyof Omit<SelectionTests, 'remote' | 'settings'>;
        });
    });
});
