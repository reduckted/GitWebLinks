import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';

export interface WorkspaceData {
    gitInfo: GitInfo;

    handler: LinkHandler;
}
