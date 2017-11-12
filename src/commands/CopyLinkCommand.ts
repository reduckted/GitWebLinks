import { commands, Disposable, Uri, window, workspace, WorkspaceFolder } from 'vscode';

import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { Clipboard } from '../utilities/Clipboard';
import { Selection } from '../utilities/Selection';
import { WorkspaceData } from '../utilities/WorkspaceData';
import { WorkspaceMap } from '../utilities/WorkspaceMap';


export abstract class CopyLinkCommand extends Disposable {

    private disposable: Disposable;


    constructor(identifier: string, private workspaceMap: WorkspaceMap) {
        super(() => this.disposable && this.disposable.dispose());
        this.disposable = commands.registerCommand(identifier, this.execute, this);
    }


    protected async execute(resource: Uri | undefined): Promise<any> {
        if (resource && (resource.scheme === 'file')) {
            let folder: WorkspaceFolder | undefined;


            folder = workspace.getWorkspaceFolder(resource);

            if (folder) {
                let data: WorkspaceData | undefined;


                data = this.workspaceMap.get(folder);

                if (data) {
                    let selection: Selection | undefined;
                    let url: string;


                    selection = this.getLineSelection();

                    url = await data.handler.makeUrl(data.gitInfo, resource.fsPath, selection);

                    await Clipboard.setText(url);

                } else {
                    window.showErrorMessage('This workspace is not tracked by Git.');
                }
            }
        }
    }


    protected abstract getLineSelection(): Selection | undefined;

}
