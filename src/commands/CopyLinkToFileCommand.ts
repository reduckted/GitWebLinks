import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { Selection } from '../utilities/Selection';
import { CopyLinkCommand } from './CopyLinkCommand';


export class CopyLinkToFileCommand extends CopyLinkCommand {

    constructor(gitInfo: GitInfo, linkHandler: LinkHandler) {
        super('gitweblinks.copyFile', gitInfo, linkHandler);
    }


    protected getLineSelection(): Selection | undefined {
        return undefined;
    }

}

