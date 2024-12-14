import type { ConfigurationChangeEvent } from 'vscode';

import type { Git, GitRepository } from '../src/git';

import { expect } from 'chai';
import * as sinon from 'sinon';
import { commands, EventEmitter, workspace } from 'vscode';

import { CONTEXT } from '../src/constants';
import { ContextManager } from '../src/context-manager';
import { Settings } from '../src/settings';

import { getGitService } from './helpers';

describe('ContextManager', () => {
    let manager: ContextManager | undefined;
    let didChangeConfiguration: EventEmitter<ConfigurationChangeEvent>;
    let didChangeRepositories: EventEmitter<void>;
    let context: Record<string, unknown>;
    let getShowCopy: sinon.SinonStub<[], boolean>;
    let getShowOpen: sinon.SinonStub<[], boolean>;
    let git: Git;
    let repositories: GitRepository[];

    beforeEach(() => {
        context = {};

        getShowCopy = sinon.stub(Settings.prototype, 'getShowCopy');
        getShowOpen = sinon.stub(Settings.prototype, 'getShowOpen');

        didChangeConfiguration = new EventEmitter();
        didChangeRepositories = new EventEmitter();
        sinon.stub(workspace, 'onDidChangeConfiguration').value(didChangeConfiguration.event);

        repositories = [];
        git = getGitService();
        sinon.stub(git, 'onDidChangeRepositories').value(didChangeRepositories.event);
        sinon.stub(git, 'repositories').value(repositories);

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
        didChangeConfiguration.dispose();
        didChangeRepositories.dispose();
        manager?.dispose();
    });

    describe('hasRepositories', () => {
        it('should initialize the value correctly.', () => {
            // Has repositories.
            repositories.push(repository());
            manager = new ContextManager(git);
            expect(context[CONTEXT.hasRepositories], 'all').to.be.true;
            manager.dispose();
            manager = undefined;

            // Does not have repositories.
            repositories.length = 0;
            manager = new ContextManager(git);
            expect(context[CONTEXT.hasRepositories], 'none').to.be.false;
            manager.dispose();
            manager = undefined;
        });

        it('should set the context when repositories change.', () => {
            manager = new ContextManager(git);

            expect(context[CONTEXT.hasRepositories], 'initial').to.be.false;

            // Now has repositories.
            repositories.push(repository());
            didChangeRepositories.fire();
            expect(context[CONTEXT.hasRepositories], 'one').to.be.true;

            // Still has repositories.
            repositories.push(repository());
            didChangeRepositories.fire();
            expect(context[CONTEXT.hasRepositories], 'two').to.be.true;

            // Still has repositories.
            repositories.pop();
            didChangeRepositories.fire();
            expect(context[CONTEXT.hasRepositories], 'one').to.be.true;

            // No longer has repositories.
            repositories.pop();
            didChangeRepositories.fire();
            expect(context[CONTEXT.hasRepositories], 'none').to.be.false;
        });
    });

    describe('canCopy', () => {
        [true, false].forEach((value) => {
            it(`should initialize the value from the setting when ${value}.`, () => {
                getShowCopy.returns(value);
                manager = new ContextManager(git);
                expect(context[CONTEXT.canCopy]).to.equal(value);
            });
        });

        it('should set the context based on the setting.', () => {
            getShowCopy.returns(false);
            manager = new ContextManager(git);

            getShowCopy.returns(true);
            didChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canCopy]).to.be.true;

            getShowCopy.returns(false);
            didChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canCopy]).to.be.false;
        });

        it('does not change the context if the configuration change did not affect the plugin.', () => {
            getShowCopy.returns(false);
            manager = new ContextManager(git);
            expect(context[CONTEXT.canCopy]).to.be.false;

            getShowCopy.returns(true);
            didChangeConfiguration.fire({ affectsConfiguration: () => false });
            expect(context[CONTEXT.canCopy]).to.be.false;
        });
    });

    describe('canOpen', () => {
        [true, false].forEach((value) => {
            it(`should initialize the value from the setting when ${value}.`, () => {
                getShowOpen.returns(value);
                manager = new ContextManager(git);
                expect(context[CONTEXT.canOpen]).to.equal(value);
            });
        });

        it('should set the context based on the setting.', () => {
            getShowOpen.returns(false);
            manager = new ContextManager(git);

            getShowOpen.returns(true);
            didChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canOpen]).to.be.true;

            getShowOpen.returns(false);
            didChangeConfiguration.fire({ affectsConfiguration: () => true });
            expect(context[CONTEXT.canOpen]).to.be.false;
        });

        it('does not change the context if the configuration change did not affect the plugin.', () => {
            getShowOpen.returns(false);
            manager = new ContextManager(git);
            expect(context[CONTEXT.canOpen]).to.be.false;

            getShowOpen.returns(true);
            didChangeConfiguration.fire({ affectsConfiguration: () => false });
            expect(context[CONTEXT.canOpen]).to.be.false;
        });
    });
});

function repository(): GitRepository {
    // The Repository object is never actually
    // used, so we can just use an empty object.
    return {} as unknown as GitRepository;
}
