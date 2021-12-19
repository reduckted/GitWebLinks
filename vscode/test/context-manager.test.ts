import { expect } from 'chai';
import * as sinon from 'sinon';
import { commands, ConfigurationChangeEvent, EventEmitter, Uri, workspace } from 'vscode';

import { CONTEXT } from '../src/constants';
import { ContextManager } from '../src/context-manager';
import { RepositoryFinder } from '../src/repository-finder';
import { Settings } from '../src/settings';
import { WorkspaceInfo, WorkspaceTracker } from '../src/workspace-tracker';

describe('ContextManager', () => {
    let manager: ContextManager | undefined;
    let tracker: WorkspaceTracker;
    let onWorkspacesChanged: EventEmitter<WorkspaceInfo[]>;
    let onDidChangeConfiguration: EventEmitter<ConfigurationChangeEvent>;
    let context: Record<string, unknown>;
    let getShowCopy: sinon.SinonStub<[], boolean>;
    let getShowOpen: sinon.SinonStub<[], boolean>;

    beforeEach(() => {
        context = {};

        getShowCopy = sinon.stub(Settings.prototype, 'getShowCopy');
        getShowOpen = sinon.stub(Settings.prototype, 'getShowOpen');

        tracker = new WorkspaceTracker(new RepositoryFinder());

        onWorkspacesChanged = new EventEmitter();
        sinon.stub(tracker, 'onWorkspacesChanged').value(onWorkspacesChanged.event);

        onDidChangeConfiguration = new EventEmitter();
        sinon.stub(workspace, 'onDidChangeConfiguration').value(onDidChangeConfiguration.event);

        sinon
            .stub(commands, 'executeCommand')
            .withArgs('setContext')
            .callsFake(async (_: string, name: string, value: unknown) => {
                context[name] = value;
                return Promise.resolve();
            });
    });

    afterEach(() => {
        sinon.restore();
        onWorkspacesChanged.dispose();
        onDidChangeConfiguration.dispose();
        tracker.dispose();
        manager?.dispose();
    });

    describe('hasRepositories', () => {
        it('should initialize the value correctly.', () => {
            let workspaces: WorkspaceInfo[];

            sinon.stub(tracker, 'workspaces').get(() => workspaces);

            // All have repositories.
            workspaces = [createWorkspace(true), createWorkspace(true)];
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.hasRepositories], 'all').to.be.true;
            manager.dispose();
            manager = undefined;

            // None have repositories.
            workspaces = [createWorkspace(false), createWorkspace(false)];
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.hasRepositories], 'none').to.be.false;
            manager.dispose();
            manager = undefined;

            // Some have repositories.
            workspaces = [createWorkspace(false), createWorkspace(true)];
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.hasRepositories], 'some').to.be.true;
            manager.dispose();
            manager = undefined;

            // No repositories.
            workspaces = [];
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.hasRepositories], 'empty').to.be.false;
            manager.dispose();
            manager = undefined;
        });

        it('should set the context based on whether any workspaces have repositories.', () => {
            manager = new ContextManager(tracker);

            expect(context[CONTEXT.hasRepositories], 'initial').to.be.false;

            // All have repositories.
            onWorkspacesChanged.fire([createWorkspace(true), createWorkspace(true)]);
            expect(context[CONTEXT.hasRepositories], 'all').to.be.true;

            // None have repositories.
            onWorkspacesChanged.fire([createWorkspace(false), createWorkspace(false)]);
            expect(context[CONTEXT.hasRepositories], 'none').to.be.false;

            // Some have repositories.
            onWorkspacesChanged.fire([createWorkspace(false), createWorkspace(true)]);
            expect(context[CONTEXT.hasRepositories], 'some').to.be.true;

            // No repositories.
            onWorkspacesChanged.fire([]);
            expect(context[CONTEXT.hasRepositories], 'empty').to.be.false;
        });
    });

    describe('canCopy', () => {
        [true, false].forEach((value) => {
            it(`should initialize the value from the setting when ${value}.`, () => {
                getShowCopy.returns(value);
                manager = new ContextManager(tracker);
                expect(context[CONTEXT.canCopy]).to.equal(value);
            });
        });

        it('should set the context based on the setting.', () => {
            getShowCopy.returns(false);
            manager = new ContextManager(tracker);

            getShowCopy.returns(true);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canCopy]).to.be.true;

            getShowCopy.returns(false);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canCopy]).to.be.false;
        });

        it('does not change the context if the configuration change did not affect the plugin.', () => {
            getShowCopy.returns(false);
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.canCopy]).to.be.false;

            getShowCopy.returns(true);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => false });
            expect(context[CONTEXT.canCopy]).to.be.false;
        });
    });

    describe('canOpen', () => {
        [true, false].forEach((value) => {
            it(`should initialize the value from the setting when ${value}.`, () => {
                getShowOpen.returns(value);
                manager = new ContextManager(tracker);
                expect(context[CONTEXT.canOpen]).to.equal(value);
            });
        });

        it('should set the context based on the setting.', () => {
            getShowOpen.returns(false);
            manager = new ContextManager(tracker);

            getShowOpen.returns(true);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canOpen]).to.be.true;

            getShowOpen.returns(false);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canOpen]).to.be.false;
        });

        it('does not change the context if the configuration change did not affect the plugin.', () => {
            getShowOpen.returns(false);
            manager = new ContextManager(tracker);
            expect(context[CONTEXT.canOpen]).to.be.false;

            getShowOpen.returns(true);
            onDidChangeConfiguration.fire({ affectsConfiguration: () => false });
            expect(context[CONTEXT.canOpen]).to.be.false;
        });
    });

    function createWorkspace(hasRepositories: boolean): WorkspaceInfo {
        return { uri: Uri.parse('http://example.com'), hasRepositories };
    }
});
