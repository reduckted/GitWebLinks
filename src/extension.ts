import { commands, ExtensionContext, window, workspace } from 'vscode';

import { CopyLinkToFileCommand } from './commands/CopyLinkToFileCommand';
import { CopyLinkToSelectionCommand } from './commands/CopyLinkToSelectionCommand';
import { EXTENSION_NAME } from './constants';
import { Git } from './git/Git';
import { GitInfo } from './git/GitInfo';
import { GitInfoFinder } from './git/GitInfoFinder';
import { LinkHandler } from './links/LinkHandler';
import { LinkHandlerFinder } from './links/LinkHandlerFinder';


export async function activate(context: ExtensionContext): Promise<void> {
    let enabled: boolean;


    enabled = false;

    if (await initializeGit()) {
        if (workspace.rootPath) {
            let gitInfo: GitInfo | undefined;


            gitInfo = await findGitInfo(workspace.rootPath);

            if (gitInfo) {
                let handler: LinkHandler | undefined;


                handler = (new LinkHandlerFinder()).find(gitInfo);

                if (handler) {
                    context.subscriptions.push(new CopyLinkToFileCommand(gitInfo, handler));
                    context.subscriptions.push(new CopyLinkToSelectionCommand(gitInfo, handler));
                    enabled = true;
                }
            }
        }
    }

    // Set the context for our commands. If we found the
    // Git info and a handler, then those commands can run.
    await commands.executeCommand('setContext', 'gitweblinks:canCopy', enabled);
}


export function deactivate(): void {
    // Nothing to do here.
}


async function initializeGit(): Promise<boolean> {
    try {
        await Git.test();
        return true;

    } catch (ex) {
        window.showErrorMessage(
            `${EXTENSION_NAME} could not find Git. Make sure Git is installed and in the PATH.`
        );

        return false;
    }
}


async function findGitInfo(workspaceRoot: string): Promise<GitInfo | undefined> {
    try {
        return await (new GitInfoFinder()).find(workspaceRoot);

    } catch (ex) {
        // tslint:disable-next-line:no-console
        console.error('Failed to initialize: ', ex);
        window.showErrorMessage('Git Web Links failed to initialize.');
    }
}
