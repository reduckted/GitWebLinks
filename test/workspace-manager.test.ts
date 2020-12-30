import * as sinon from 'sinon';
import { expect } from 'chai';
import * as vscode from 'vscode';
import { LinkHandler } from '../src/link-handler';
import { Repository, RepositoryWithRemote } from '../src/types';
import { WorkspaceInfo, WorkspaceManager } from '../src/workspace-manager';
import { RepositoryFinder } from '../src/repository-finder';
import { Directory, MockWorkspace, tick } from './helpers';
import { LinkHandlerSelector } from '../src/link-handler-selector';

describe('WorkspaceManager', () => {
    let manager: WorkspaceManager;
    let repositoryFinder: RepositoryFinder;
    let findRepository: sinon.SinonStub<[string], Promise<Repository | undefined>>;
    let handlerSelector: LinkHandlerSelector;
    let selectHandler: sinon.SinonStub<[RepositoryWithRemote], LinkHandler | undefined>;
    let root: Directory;
    let workspace: MockWorkspace;
    let changes: WorkspaceInfo[] | undefined;

    beforeEach(async () => {
        repositoryFinder = new RepositoryFinder();
        findRepository = sinon.stub(repositoryFinder, 'find');

        handlerSelector = new LinkHandlerSelector();
        selectHandler = sinon.stub(handlerSelector, 'select');

        workspace = new MockWorkspace();
        sinon.stub(vscode, 'workspace').get(() => workspace);

        root = await Directory.create();
    });

    afterEach(async () => {
        await manager?.dispose();
        await root.dispose();
        sinon.restore();
    });

    it('should initialize with the current workspaces.', async () => {
        let alpha: TestWorkspace;
        let beta: TestWorkspace;

        alpha = await add('alpha', true, true);
        beta = await add('beta', true, true);

        await create();

        // Verify that the "changed" callback was called.
        expect(changes).to.exist;
        expect(changes!.map((x) => x.uri).sort(compareUris)).to.deep.equal([alpha.uri, beta.uri]);

        // Verify that each workspace has been stored.
        expect(manager.get(alpha.folder)).to.deep.equal({
            uri: alpha.uri,
            repository: alpha.repository,
            handler: alpha.handler
        });

        expect(manager.get(beta.folder)).to.deep.equal({
            uri: beta.uri,
            repository: beta.repository,
            handler: beta.handler
        });
    });

    it('should emit change when workspace is added.', async () => {
        let alpha: TestWorkspace;
        let beta: TestWorkspace;

        alpha = await add('alpha', true, true);

        await create();

        beta = await add('beta', true, true);

        expect(changes).to.exist;
        expect(changes!.map((x) => x.uri).sort(compareUris)).to.deep.equal([alpha.uri, beta.uri]);

        expect(manager.get(alpha.folder)).to.deep.equal({
            uri: alpha.uri,
            repository: alpha.repository,
            handler: alpha.handler
        });

        expect(manager.get(beta.folder)).to.deep.equal({
            uri: beta.uri,
            repository: beta.repository,
            handler: beta.handler
        });
    });

    it('should emit change when workspace is removed.', async () => {
        let alpha: TestWorkspace;
        let beta: TestWorkspace;

        alpha = await add('alpha', true, true);
        beta = await add('beta', true, true);

        await create();

        await remove(beta);

        expect(changes).to.exist;
        expect(changes!.map((x) => x.uri).sort(compareUris)).to.deep.equal([alpha.uri]);

        expect(manager.get(alpha.folder)).to.deep.equal({
            uri: alpha.uri,
            repository: alpha.repository,
            handler: alpha.handler
        });

        expect(manager.get(beta.folder)).to.be.undefined;
    });

    it('stores workspaces without a repository.', async () => {
        let alpha: TestWorkspace;

        await create();

        alpha = await add('alpha', false, false);

        expect(manager.get(alpha.folder)).to.deep.equal({
            uri: alpha.uri,
            repository: undefined,
            handler: undefined
        });
    });

    it('stores workspaces without a link handler.', async () => {
        let alpha: TestWorkspace;

        await create();

        alpha = await add('alpha', true, false);

        expect(manager.get(alpha.folder)).to.deep.equal({
            uri: alpha.uri,
            repository: alpha.repository,
            handler: undefined
        });
    });

    async function create() {
        manager = new WorkspaceManager(
            repositoryFinder,
            handlerSelector,
            (x) => (changes = [...x])
        );
        await tick();
    }

    async function add(
        name: string,
        hasRepository: boolean,
        hasHandler: boolean
    ): Promise<TestWorkspace> {
        let info: TestWorkspace;
        let uri: vscode.Uri;
        let repository: RepositoryWithRemote | undefined;
        let handler: LinkHandler | undefined;

        uri = vscode.Uri.file(await root.mkdirp(name));

        if (hasRepository) {
            repository = { root: uri.fsPath, remote: 'https://example.com' };
        }

        if (hasHandler) {
            handler = new LinkHandler({
                name: 'Test',
                server: { http: 'http://example.com', ssh: 'ssh://example.com' },
                branch: ['rev-parse'],
                url: '',
                selection: ''
            });
        }

        findRepository.withArgs(uri.fsPath).resolves(repository);

        if (repository) {
            selectHandler.withArgs(repository).returns(handler);
        }

        info = {
            uri,
            folder: await workspace.add(uri),
            repository,
            handler
        };

        // Tick to let the change handler complete.
        await tick();

        return info;
    }

    async function remove(item: TestWorkspace): Promise<void> {
        await workspace.remove(item.uri);
        await tick();
    }

    function compareUris(a: vscode.Uri, b: vscode.Uri): number {
        return a.toString().localeCompare(b.toString());
    }
});

interface TestWorkspace {
    uri: vscode.Uri;
    folder: vscode.WorkspaceFolder;
    repository: Repository | undefined;
    handler: LinkHandler | undefined;
}
