import * as chai from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';

import { CopyLinkToFileCommand } from '../src/commands/CopyLinkToFileCommand';
import { CopyLinkToSelectionCommand } from '../src/commands/CopyLinkToSelectionCommand';
import * as extension from '../src/extension';
import { Git } from '../src/git/Git';
import { GitInfo } from '../src/git/GitInfo';
import { GitInfoFinder } from '../src/git/GitInfoFinder';
import { LinkHandler } from '../src/links/LinkHandler';
import { LinkHandlerFinder } from '../src/links/LinkHandlerFinder';


const expect = chai.use(sinonChai).expect;


describe('extension', () => {

    describe('activate', () => {

        let sandbox: sinon.SinonSandbox;
        let context: vscode.ExtensionContext;


        function mockContext(): vscode.ExtensionContext {
            return {
                subscriptions: [],
            } as any as vscode.ExtensionContext;
        }


        async function expectCommandsToHaveNotBeenRegistered(): Promise<void> {
            let commands: string[];


            commands = await vscode.commands.getCommands();

            expect(commands).to.not.contain('gitweblinks.copyFile');
            expect(commands).to.not.contain('gitweblinks.copySelection');
            expect(context.subscriptions).to.be.empty;
        }


        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            context = mockContext();
            sinon.stub(vscode, 'workspace').value({ rootPath: undefined });
        });


        afterEach(async () => {
            context.subscriptions.forEach((d) => d.dispose());
            sandbox.restore();
        });


        it('should disable the commands if Git is not initialized.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;


            test = sandbox.stub(Git, 'test').returns(Promise.reject(new Error('nope')));
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(undefined));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(Promise.resolve(undefined));
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            await extension.activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;

            await expectCommandsToHaveNotBeenRegistered();
        });


        it('should disable the commands if there is no workspace root.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;


            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(undefined));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(Promise.resolve(undefined));
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            vscode.workspace.rootPath = undefined;

            await extension.activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;

            await expectCommandsToHaveNotBeenRegistered();
        });


        it('should disable the commands if Git info is not found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;


            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(undefined));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(Promise.resolve(undefined));
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            vscode.workspace.rootPath = 'abc';

            await extension.activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findHandler).to.have.not.been.called;

            await expectCommandsToHaveNotBeenRegistered();
        });


        it('should disable the commands if no link handler was found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;
            let info: GitInfo;


            info = { rootDirectory: 'a', remoteUrl: 'b' };

            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(info));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(undefined);
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            vscode.workspace.rootPath = 'abc';

            await extension.activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            await expectCommandsToHaveNotBeenRegistered();
        });


        it('should enable the commands if a link handler was found.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;
            let info: GitInfo;
            let handler: LinkHandler;
            let commands: string[];


            info = { rootDirectory: 'a', remoteUrl: 'b' };
            handler = {} as any;

            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(info));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(handler);
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            vscode.workspace.rootPath = 'abc';

            await extension.activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', true);

            commands = await vscode.commands.getCommands();
            expect(commands).to.contain('gitweblinks.copyFile');
            expect(commands).to.contain('gitweblinks.copySelection');

            expect(context.subscriptions).to.have.lengthOf(2);
            expect(context.subscriptions.filter((x) => x instanceof CopyLinkToFileCommand)).to.have.lengthOf(1);
            expect(context.subscriptions.filter((x) => x instanceof CopyLinkToSelectionCommand)).to.have.lengthOf(1);
        });

    });

});
