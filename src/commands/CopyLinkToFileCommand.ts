import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { Selection } from '../utilities/Selection';
import { WorkspaceMap } from '../utilities/WorkspaceMap';
import { CopyLinkCommand } from './CopyLinkCommand';


export class CopyLinkToFileCommand extends CopyLinkCommand {

    constructor(workspaceMap: WorkspaceMap) {
        super('gitweblinks.copyFile', workspaceMap);
    }


    protected getLineSelection(): Selection | undefined {
        return undefined;
    }

}

