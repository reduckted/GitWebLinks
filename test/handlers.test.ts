import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import { Uri, workspace } from 'vscode';

import { git } from '../src/git';
import { LinkHandler } from '../src/link-handler';
import { LinkHandlerSelector } from '../src/link-handler-selector';
import { load } from '../src/schema';
import { parseTemplate } from '../src/templates';
import { LinkOptions, RepositoryWithRemote, SelectedRange } from '../src/types';

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
    let selector: LinkHandlerSelector;
    let root: Directory;

    // We need to create repositories, so mark the
    // tests as being a bit slower than other tests.
    markAsSlow(this);

    before(() => {
        selector = new LinkHandlerSelector();
    });

    beforeEach(async () => {
        root = await Directory.create();
    });

    afterEach(async () => {
        sinon.restore();
        await root.dispose();
    });

    definitions.forEach((definition) => {
        describe(definition.name, () => {
            describe('createUrl', () => {
                beforeEach(async () => {
                    await setupRepository(root.path);
                });

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

                async function runRemoteTest(
                    name: keyof Omit<RemoteUrlTests, 'result' | 'settings'>
                ): Promise<void> {
                    await runTest({
                        settings: definition.tests.createUrl.remotes.settings,
                        remote: definition.tests.createUrl.remotes[name],
                        result: definition.tests.createUrl.remotes.result
                    });
                }

                async function runUrlTest(
                    name: keyof Omit<UrlTests, 'misc' | 'selection' | 'remotes'>,
                    options: TestOptions = {}
                ): Promise<void> {
                    await runTest(definition.tests.createUrl[name], options);
                }

                async function runSelectionTest<
                    T extends keyof Omit<SelectionTests, 'remote' | 'settings'>
                >(name: T, selection: (test: SelectionTests[T]) => SelectedRange): Promise<void> {
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

                    setupSettings(settings);

                    if (options.branch) {
                        await git(root.path, 'checkout', '-b', options.branch);
                    }

                    // Treat the test result as a template and allow
                    // the current commit hash to be used in the result.
                    result = parseTemplate(result).render({
                        commit: (await git(root.path, 'rev-parse', 'HEAD')).trim()
                    });

                    repository = {
                        root: root.path,
                        remote
                    };

                    handler = selector.select(repository);

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
        });
    });
});
