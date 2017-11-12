import * as chai from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as vscode from 'vscode';

import { CopyLinkToFileCommand } from '../src/commands/CopyLinkToFileCommand';
import { CopyLinkToSelectionCommand } from '../src/commands/CopyLinkToSelectionCommand';
import { ExtensionHost } from '../src/ExtensionHost';
import { Git } from '../src/git/Git';
import { GitInfo } from '../src/git/GitInfo';
import { GitInfoFinder } from '../src/git/GitInfoFinder';
import { LinkHandler } from '../src/links/LinkHandler';
import { LinkHandlerFinder } from '../src/links/LinkHandlerFinder';


const expect = chai.use(sinonChai).expect;


describe('ExtensionHost', () => {

    describe('activate', () => {

        let sandbox: sinon.SinonSandbox;
        let context: vscode.ExtensionContext;
        let onDidChangeWorkspaceFolders: (e: vscode.WorkspaceFoldersChangeEvent) => Promise<void>;


        function mockContext(): vscode.ExtensionContext {
            return {
                subscriptions: [],
            } as any as vscode.ExtensionContext;
        }


        beforeEach(() => {
            sandbox = sinon.sandbox.create();
            context = mockContext();
            onDidChangeWorkspaceFolders = undefined as any;

            sinon.stub(vscode, 'workspace').value({
                workspaceFolders: undefined,
                onDidChangeWorkspaceFolders: (callback: (e: vscode.WorkspaceFoldersChangeEvent) => Promise<void>) => {
                    onDidChangeWorkspaceFolders = callback;
                    return { dispose: () => undefined };
                }
            });
        });


        afterEach(async () => {
            context.subscriptions.forEach((d) => d.dispose());
            sandbox.restore();
        });


        it('should add the commands to the subscriptions when Git is initialized.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;


            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(undefined));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(Promise.resolve(undefined));

            await (new ExtensionHost()).activate(context);

            expect(context.subscriptions.filter((x) => x instanceof CopyLinkToFileCommand)).to.have.lengthOf(1);
            expect(context.subscriptions.filter((x) => x instanceof CopyLinkToSelectionCommand)).to.have.lengthOf(1);
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

            await (new ExtensionHost()).activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;
        });


        it('should disable the commands if there are no workspaces.', async () => {
            let test: sinon.SinonSpy;
            let findGitInfo: sinon.SinonSpy;
            let findHandler: sinon.SinonSpy;
            let executeCommand: sinon.SinonSpy;


            test = sandbox.stub(Git, 'test').returns(Promise.resolve());
            findGitInfo = sandbox.stub(GitInfoFinder.prototype, 'find').returns(Promise.resolve(undefined));
            findHandler = sandbox.stub(LinkHandlerFinder.prototype, 'find').returns(Promise.resolve(undefined));
            executeCommand = sandbox.spy(vscode.commands, 'executeCommand');

            vscode.workspace.workspaceFolders = undefined;

            await (new ExtensionHost()).activate(context);

            expect(test).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findGitInfo).to.have.not.been.called;
            expect(findHandler).to.have.not.been.called;
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

            vscode.workspace.workspaceFolders = [{
                index: 0,
                name: 'foo',
                uri: vscode.Uri.parse('file:///abc')
            }];

            await (new ExtensionHost()).activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            expect(findHandler).to.have.not.been.called;
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

            vscode.workspace.workspaceFolders = [{
                index: 0,
                name: 'foo',
                uri: vscode.Uri.parse('file:///abc')
            }];

            await (new ExtensionHost()).activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);
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

            vscode.workspace.workspaceFolders = [{
                index: 0,
                name: 'foo',
                uri: vscode.Uri.parse('file:///abc')
            }];

            await (new ExtensionHost()).activate(context);

            expect(test).to.have.been.called;
            expect(findGitInfo).to.have.been.called;
            expect(findHandler).to.have.been.called;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', true);

            commands = await vscode.commands.getCommands();
            expect(commands).to.contain('gitweblinks.copyFile');
            expect(commands).to.contain('gitweblinks.copySelection');
        });


        it('should enable the commands when a new workspace with Git Info is added.', async () => {
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

            vscode.workspace.workspaceFolders = undefined;

            await (new ExtensionHost()).activate(context);

            expect(onDidChangeWorkspaceFolders).to.not.be.undefined;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);

            await onDidChangeWorkspaceFolders({
                added: [{
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///foo')
                }],
                removed: []
            });

            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', true);
        });


        it('should keep commands enabled when a workspace with Git Info is removed, but others remain.', async () => {
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

            vscode.workspace.workspaceFolders = [
                {
                    index: 0,
                    name: 'foo',
                    uri: vscode.Uri.parse('file:///foo')
                },
                {
                    index: 1,
                    name: 'bar',
                    uri: vscode.Uri.parse('file:///bar')
                }
            ];

            await (new ExtensionHost()).activate(context);

            expect(onDidChangeWorkspaceFolders).to.not.be.undefined;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', true);

            await onDidChangeWorkspaceFolders({
                added: [],
                removed: [vscode.workspace.workspaceFolders[0]]
            });

            expect(executeCommand).to.have.not.been.calledWith('setContext', 'gitweblinks:canCopy', false);
        });


        it('should disable the commands when a workspace with Git Info is removed and no others remain.', async () => {
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

            vscode.workspace.workspaceFolders = [{
                index: 0,
                name: 'foo',
                uri: vscode.Uri.parse('file:///foo')
            }];

            await (new ExtensionHost()).activate(context);

            expect(onDidChangeWorkspaceFolders).to.not.be.undefined;
            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', true);

            await onDidChangeWorkspaceFolders({
                added: [],
                removed: [vscode.workspace.workspaceFolders[0]]
            });

            expect(executeCommand).to.have.been.calledWith('setContext', 'gitweblinks:canCopy', false);
        });

    });

});
