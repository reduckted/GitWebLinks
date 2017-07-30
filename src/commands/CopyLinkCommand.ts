import { commands, Disposable, Uri, window } from 'vscode';

import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { Clipboard } from '../utilities/Clipboard';
import { Selection } from '../utilities/Selection';


export abstract class CopyLinkCommand extends Disposable {

    private disposable: Disposable;


    constructor(identifier: string, private gitInfo: GitInfo, private linkHandler: LinkHandler) {
        super(() => this.disposable && this.disposable.dispose());
        this.disposable = commands.registerCommand(identifier, this.execute, this);
    }


    protected async execute(resource: Uri | undefined): Promise<any> {
        if (resource && (resource.scheme === 'file')) {
            let selection: Selection | undefined;
            let url: string;


            selection = this.getLineSelection();

            url = await this.linkHandler.makeUrl(this.gitInfo, resource.fsPath, selection);

            Clipboard.setText(url);
        }
    }


    protected abstract getLineSelection(): Selection | undefined;

}
