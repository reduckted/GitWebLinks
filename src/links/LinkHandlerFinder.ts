import { GitInfo } from '../git/GitInfo';
import { AzureDevOpsHandler } from './AzureDevOpsHandler';
import { BitbucketCloudHandler } from './BitbucketCloudHandler';
import { BitbucketServerHandler } from './BitbucketServerHandler';
import { GitHubHandler } from './GitHubHandler';
import { LinkHandler } from './LinkHandler';
import { VisualStudioTeamServicesHandler } from './VisualStudioTeamServicesHandler';

export class LinkHandlerFinder {
    private handlers: LinkHandler[];

    constructor() {
        this.handlers = [
            new AzureDevOpsHandler(),
            new BitbucketCloudHandler(),
            new BitbucketServerHandler(),
            new GitHubHandler(),
            new VisualStudioTeamServicesHandler()
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
