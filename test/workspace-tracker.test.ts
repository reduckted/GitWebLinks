import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { RepositoryFinder } from '../src/repository-finder';
import { WorkspaceInfo, WorkspaceTracker } from '../src/workspace-tracker';

import { Directory, MockWorkspace, tick } from './helpers';

describe('WorkspaceTracker', () => {
    let tracker: WorkspaceTracker;
    let repositoryFinder: RepositoryFinder;
    let hasRepositories: sinon.SinonStub<[string], Promise<boolean>>;
    let root: Directory;
    let workspace: MockWorkspace;
    let changes: WorkspaceInfo[] | undefined;

    beforeEach(async () => {
        repositoryFinder = new RepositoryFinder();
        hasRepositories = sinon.stub(repositoryFinder, 'hasRepositories');

        workspace = new MockWorkspace();
        sinon.stub(vscode, 'workspace').get(() => workspace);

        root = await Directory.create();
    });

    afterEach(async () => {
        await tracker?.dispose();
        await root.dispose();
        sinon.restore();
    });

    it('should initialize with the current workspaces.', async () => {
        let alpha: vscode.Uri;
        let beta: vscode.Uri;

        alpha = await add('alpha', true);
        beta = await add('beta', true);

        await create();

        expect(changes?.sort(compareByUri)).to.deep.equal([
            { uri: alpha, hasRepositories: true },
            { uri: beta, hasRepositories: true }
        ]);
    });

    it('should emit change when workspace is added.', async () => {
        let alpha: vscode.Uri;
        let beta: vscode.Uri;

        alpha = await add('alpha', true);

        await create();

        beta = await add('beta', true);

        expect(changes?.sort(compareByUri)).to.deep.equal([
            { uri: alpha, hasRepositories: true },
            { uri: beta, hasRepositories: true }
        ]);
    });

    it('should emit change when workspace is removed.', async () => {
        let alpha: vscode.Uri;
        let beta: vscode.Uri;

        alpha = await add('alpha', true);
        beta = await add('beta', true);

        await create();

        await remove(beta);

        expect(changes?.sort(compareByUri)).to.deep.equal([{ uri: alpha, hasRepositories: true }]);
    });

    it('stores workspaces without a repository.', async () => {
        let alpha: vscode.Uri;

        await create();

        alpha = await add('alpha', false);

        expect(changes).to.deep.equal([{ uri: alpha, hasRepositories: false }]);
    });

    async function create(): Promise<void> {
        tracker = new WorkspaceTracker(repositoryFinder, (x) => (changes = [...x]));
        await tick();
    }

    async function add(name: string, hasRepository: boolean): Promise<vscode.Uri> {
        let uri: vscode.Uri;

        uri = vscode.Uri.file(await root.mkdirp(name));

        hasRepositories.withArgs(uri.fsPath).resolves(hasRepository);

        await workspace.add(uri);

        // Tick to let the change handler complete.
        await tick();

        return uri;
    }

    async function remove(uri: vscode.Uri): Promise<void> {
        await workspace.remove(uri);
        await tick();
    }

    function compareByUri(a: WorkspaceInfo, b: WorkspaceInfo): number {
        return a.uri.toString().localeCompare(b.uri.toString());
    }
});
