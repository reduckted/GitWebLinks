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
import { INVALID_PATH } from '../constants';

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

                    url = await data.handler.makeUrl(
                        data.gitInfo,
                        resource.fsPath,
                        selection
                    );

                    if (url === INVALID_PATH) {
                        window.showInformationMessage(
                            'Web link could not be resolved.'
                        );
                    } else {
                        await env.clipboard.writeText(url);
                        window.showInformationMessage(
                            'Web link copied to the clipboard.'
                        );
                    }
                } else {
                    window.showErrorMessage(
                        'This workspace is not tracked by Git.'
                    );
                }
            } else {
                window.showErrorMessage(
                    "Cannot copy a link to the file because it's not in a workspace."
                );
            }
        } else {
            window.showErrorMessage(
                'Cannot copy a link because no file is selected.'
            );
        }
    }

    protected abstract getLineSelection(): Selection | undefined;
}
