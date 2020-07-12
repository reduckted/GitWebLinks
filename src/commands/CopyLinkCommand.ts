import {
    commands,
    Disposable,
    env,
    Uri,
    window,
    workspace,
    WorkspaceFolder
} from 'vscode';

import { Selection } from '../utilities/Selection';
import { WorkspaceData } from '../utilities/WorkspaceData';
import { WorkspaceMap } from '../utilities/WorkspaceMap';
import { Logger } from '../utilities/Logger';

export abstract class CopyLinkCommand extends Disposable {
    private disposable: Disposable;

    constructor(identifier: string, private workspaceMap: WorkspaceMap) {
        super(() => this.disposable && this.disposable.dispose());
        this.disposable = commands.registerCommand(
            identifier,
            this.execute,
            this
        );
    }

    protected async execute(resource: Uri | undefined): Promise<any> {
        Logger.writeLine('Executing command.');

        // When the command is run from a menu, the resource parameter refers
        // to the file that the menu was opened from. When the command is run
        // from the command palette or via a keyboard shortcut, there won't be a
        // resource. In those cases we will use the document in the active editor.
        if (!resource) {
            resource = window.activeTextEditor?.document.uri;
        }

        if (resource && resource.scheme === 'file') {
            let folder: WorkspaceFolder | undefined;

            folder = workspace.getWorkspaceFolder(resource);

            if (folder) {
                let data: WorkspaceData | undefined;

                data = this.workspaceMap.get(folder);

                if (data) {
                    let selection: Selection | undefined;
                    let url: string;

                    selection = this.getLineSelection();
                    Logger.writeLine(`Line selection:`, selection);

                    try {
                        url = await data.handler.makeUrl(
                            data.gitInfo,
                            resource.fsPath,
                            selection
                        );

                        Logger.writeLine(`Web link created.:`, url);
                        await env.clipboard.writeText(url);

                        window.showInformationMessage(
                            'Web link copied to the clipboard.'
                        );
                    } catch (ex) {
                        Logger.writeLine(
                            `Failed to create web link.`,
                            ex.message || ex
                        );

                        window.showErrorMessage(
                            `Unable to create a web link: ${ex}`
                        );
                    }
                } else {
                    Logger.writeLine(`No workspace data for '${folder.uri}'.`);
                    window.showErrorMessage(
                        'This workspace is not tracked by Git.'
                    );
                }
            } else {
                Logger.writeLine('File is not in a workspace.', resource);
                window.showErrorMessage(
                    "Cannot copy a link to the file because it's not in a workspace."
                );
            }
        } else {
            Logger.writeLine('No file is selected.');
            window.showErrorMessage(
                'Cannot copy a link because no file is selected.'
            );
        }
    }

    protected abstract getLineSelection(): Selection | undefined;
}
