import {
    commands,
    ExtensionContext,
    window,
    workspace,
    WorkspaceFolder,
    WorkspaceFoldersChangeEvent
} from 'vscode';

import { CopyLinkToFileCommand } from './commands/CopyLinkToFileCommand';
import { CopyLinkToSelectionCommand } from './commands/CopyLinkToSelectionCommand';
import { EXTENSION_NAME } from './constants';
import { Git } from './git/Git';
import { GitInfo } from './git/GitInfo';
import { GitInfoFinder } from './git/GitInfoFinder';
import { LinkHandler } from './links/LinkHandler';
import { LinkHandlerFinder } from './links/LinkHandlerFinder';
import { WorkspaceMap } from './utilities/WorkspaceMap';
import { Logger } from './utilities/Logger';

export class ExtensionHost {
    private map: WorkspaceMap = new WorkspaceMap();

    public async activate(context: ExtensionContext): Promise<void> {
        Logger.writeLine('Activating extension.');

        if (await this.initializeGit()) {
            context.subscriptions.push(
                workspace.onDidChangeWorkspaceFolders(async (e) => {
                    await this.onWorkspaceFoldersChanged(e);
                })
            );

            context.subscriptions.push(new CopyLinkToFileCommand(this.map));
            context.subscriptions.push(
                new CopyLinkToSelectionCommand(this.map)
            );
        }

        await this.onWorkspaceFoldersChanged({
            added: workspace.workspaceFolders || [],
            removed: []
        });
    }

    private async onWorkspaceFoldersChanged(
        e: WorkspaceFoldersChangeEvent
    ): Promise<void> {
        Logger.writeLine('Workspace folders changed.', e);

        await this.addFolders(e.added);
        this.removeFolders(e.removed);

        // Set the context for our commands. If we found the Git info
        // and a handler for any workspace, then those commands can run.
        await commands.executeCommand(
            'setContext',
            'gitweblinks:canCopy',
            !this.map.isEmpty()
        );
    }

    private async addFolders(
        folders: readonly WorkspaceFolder[]
    ): Promise<void> {
        for (let folder of folders) {
            if (folder.uri.fsPath) {
                let gitInfo: GitInfo | undefined;

                Logger.writeLine(
                    `Adding workspace folder '${folder.uri.fsPath}'.`
                );

                gitInfo = await this.findGitInfo(folder.uri.fsPath);

                if (gitInfo) {
                    let handler: LinkHandler | undefined;

                    handler = new LinkHandlerFinder().find(gitInfo);

                    if (handler) {
                        Logger.writeLine(
                            `Found handler '${handler.name}' for path '${folder.uri.fsPath}'.`
                        );

                        this.map.add(folder, gitInfo, handler);
                    } else {
                        Logger.writeLine(
                            `Could not find a handler for path '${folder.uri.fsPath}'.`
                        );
                    }
                } else {
                    Logger.writeLine(
                        `Could not find Git info for path '${folder.uri.fsPath}'.`
                    );
                }
            } else {
                Logger.writeLine(
                    `Not adding workspace folder '${folder.uri}' because it has no fsPath.`
                );
            }
        }
    }

    private removeFolders(folders: readonly WorkspaceFolder[]): void {
        for (let folder of folders) {
            Logger.writeLine(`Removing workspace folder '${folder.uri}'.`);
            this.map.remove(folder);
        }
    }

    private async initializeGit(): Promise<boolean> {
        try {
            await Git.test();
            return true;
        } catch (ex) {
            Logger.writeLine('Could not find Git.', ex.message || ex);
            window.showErrorMessage(
                `${EXTENSION_NAME} could not find Git. Make sure Git is installed and in the PATH.`
            );

            return false;
        }
    }

    private async findGitInfo(
        workspaceRoot: string
    ): Promise<GitInfo | undefined> {
        try {
            return await new GitInfoFinder().find(workspaceRoot);
        } catch (ex) {
            Logger.writeLine(
                `Error finding Git info for path '${workspaceRoot}'.`,
                ex.message || ex
            );
            window.showErrorMessage('Git Web Links failed to initialize.');
            return undefined;
        }
    }
}
