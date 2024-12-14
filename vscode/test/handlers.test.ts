import type { AnySchema } from 'ajv';

import type { Git } from '../src/git';
import type { CreateUrlResult } from '../src/link-handler';
import type { SelectedLinkHandler } from '../src/link-handler-provider';
import type { Template } from '../src/schema';
import type { LinkOptions, RepositoryWithRemote, SelectedRange, UrlInfo } from '../src/types';

import type {
    HandlerWithTests,
    RemoteUrlTests,
    SelectionTests,
    TestSettings,
    UrlTest,
    UrlTests
} from './test-schema';

import Ajv from 'ajv';
import { expect } from 'chai';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as sinon from 'sinon';
import { Uri, workspace } from 'vscode';

import { LinkHandlerProvider } from '../src/link-handler-provider';
import { findHandlersDirectory, load } from '../src/schema';
import { parseTemplate } from '../src/templates';
import { normalizeUrl } from '../src/utilities';

import { Directory, getGitService, markAsSlow, setupRemote, setupRepository } from './helpers';

const TEST_FILE_NAME: string = 'src/file.txt';
const TEST_FILE_NAME_WITH_SPACES: string = 'src/path spaces/file spaces.txt';
const TEST_BRANCH_NAME: string = 'feature/test';

let definitions: HandlerWithTests[];

definitions = load<HandlerWithTests>().sort();

describe('Link handlers', function () {
    let provider: LinkHandlerProvider;
    let root: Directory;
    let remoteDirectory: Directory | undefined;
    let git: Git;

    // We need to create repositories, so mark the
    // tests as being a bit slower than other tests.
    markAsSlow(this);

    before(() => {
        git = getGitService();
        provider = new LinkHandlerProvider(git);
    });

    beforeEach(async () => {
        root = await Directory.create();
        await setupRepository(root.path);
    });

    afterEach(async () => {
        sinon.restore();
        await root.dispose();

        if (remoteDirectory) {
            await remoteDirectory.dispose();
        }
    });

    definitions.forEach((definition) => {
        describe(definition.name, () => {
            describe('schema', () => {
                let schema: AnySchema;

                before(async () => {
                    schema = JSON.parse(
                        await fs.readFile(
                            path.resolve(findHandlersDirectory(), '../handler-schema.json'),
                            { encoding: 'utf8' }
                        )
                    ) as AnySchema;
                });

                it('should have a valid JSON definition.', () => {
                    let validator: Ajv;

                    validator = new Ajv({ allErrors: true });
                    validator.addSchema(schema, 'definition');

                    expect(
                        validator.validate('definition', definition),
                        JSON.stringify(validator.errors, undefined, 4)
                    ).to.be.true;
                });
            });

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
                    await runUrlTest('branch', {
                        target: { preset: 'branch' },
                        branch: TEST_BRANCH_NAME
                    });
                });

                it('commit', async () => {
                    await runUrlTest('commit', { target: { preset: 'commit' } });
                });

                it('default branch', async () => {
                    await runTest(
                        {
                            settings: definition.tests.createUrl.remotes.settings,
                            remote: definition.tests.createUrl.remotes.http,
                            result: definition.tests.createUrl.remotes.result
                        },
                        {
                            target: { preset: 'defaultBranch' },
                            remoteName: 'origin',
                            // Run with a different branch to confirm that the remote's default branch is used.
                            branch: TEST_BRANCH_NAME
                        }
                    );
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
                    { remote: remoteUrl, result, settings }: UrlTest,
                    options: TestOptions = {}
                ): Promise<void> {
                    let repository: RepositoryWithRemote;
                    let match: SelectedLinkHandler | undefined;
                    let link: CreateUrlResult | undefined;

                    result = await prepareTest(settings, result, options);

                    repository = {
                        root: root.uri,
                        remote: { name: 'origin', urls: [remoteUrl] }
                    };

                    match = provider.select(repository);

                    expect(match, 'A handler was not found').to.exist;
                    expect(match?.handler.name).to.equal(definition.name);
                    expect(match?.remoteUrl).to.equal(remoteUrl);

                    link = await match?.handler.createUrl(
                        repository,
                        remoteUrl,
                        {
                            uri: Uri.joinPath(root.uri, options.fileName || TEST_FILE_NAME),
                            selection: options.selection
                        },
                        { target: options.target || { preset: 'branch' } }
                    );

                    expect(link?.url, 'Link does not match the expected result').to.equal(result);
                }

                interface TestOptions extends Partial<LinkOptions> {
                    fileName?: string;
                    branch?: string;
                    selection?: SelectedRange;
                    remoteName?: string;
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
                        target: { preset: 'branch' },
                        branch: TEST_BRANCH_NAME,
                        fileMayStartWithBranch: definition.reverse?.fileMayStartWithBranch
                    });
                });

                it('commit', async () => {
                    await runUrlTest('commit', { target: { preset: 'commit' } });
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
                    await runSelectionTest(
                        'point',
                        (test) => test.reverseRange ?? { startLine: test.line }
                    );
                });

                it('single-line selection', async () => {
                    await runSelectionTest(
                        'singleLine',
                        (test) => test.reverseRange ?? { startLine: test.line }
                    );
                });

                it('multi-line selection', async () => {
                    await runSelectionTest(
                        'multipleLines',
                        (test) =>
                            test.reverseRange ?? {
                                startLine: test.startLine,
                                endLine: test.endLine
                            }
                    );
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
                options: { branch?: string; remoteName?: string }
            ): Promise<string> {
                setupSettings(settings);

                if (options.branch) {
                    await git.exec(root.path, 'checkout', '-b', options.branch);
                }

                if (options.remoteName) {
                    remoteDirectory = await setupRemote(root.path, options.remoteName);
                    await git.exec(root.path, 'remote', 'set-head', options.remoteName, 'master');
                }

                // Treat the test URL as a template and allow
                // the current commit hash to be used in the result.
                return parseTemplate(url).render({
                    commit: (await git.exec(root.path, 'rev-parse', 'HEAD')).trim()
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
            type UrlTestName = keyof Omit<UrlTests, 'misc' | 'remotes' | 'selection'>;
            type SelectionTestName = keyof Omit<SelectionTests, 'remote' | 'settings'>;
        });
    });
});
