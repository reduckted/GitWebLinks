import { GitInfo } from '../git/GitInfo';
import { BitbucketCloudHandler } from './BitbucketCloudHandler';
import { BitbucketServerHandler } from './BitbucketServerHandler';
import { GitHubHandler } from './GitHubHandler';
import { LinkHandler } from './LinkHandler';


export class LinkHandlerFinder {

    private handlers: LinkHandler[];


    constructor() {
        this.handlers = [
            new BitbucketCloudHandler(),
            new BitbucketServerHandler(),
            new GitHubHandler()
        ];
    }


    public find(gitInfo: GitInfo): LinkHandler | undefined {
        for (let handler of this.handlers) {
            if (handler.isMatch(gitInfo.remoteUrl)) {
                return handler;
            }
        }

        return undefined;
    }

}
