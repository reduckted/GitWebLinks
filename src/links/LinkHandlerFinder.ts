import { GitInfo } from '../git/GitInfo';
import { AzureDevOpsHandler } from './AzureDevOpsHandler';
import { BitbucketCloudHandler } from './BitbucketCloudHandler';
import { BitbucketServerHandler } from './BitbucketServerHandler';
import { GitHubHandler } from './GitHubHandler';
import { GitLabHandler } from './GitLabHandler';
import { LinkHandler } from './LinkHandler';
import { VisualStudioTeamServicesHandler } from './VisualStudioTeamServicesHandler';
import { Logger } from '../utilities/Logger';

export class LinkHandlerFinder {
    private handlers: LinkHandler[];

    constructor() {
        this.handlers = [
            new AzureDevOpsHandler(),
            new BitbucketCloudHandler(),
            new BitbucketServerHandler(),
            new GitHubHandler(),
            new GitLabHandler(),
            new VisualStudioTeamServicesHandler()
        ];
    }

    public find(gitInfo: GitInfo): LinkHandler | undefined {
        Logger.writeLine(
            `Finding a handler for repository '${gitInfo.remoteUrl}'.`
        );

        for (let handler of this.handlers) {
            Logger.writeLine(`Testing '${handler.constructor.name}'.`);

            if (handler.isMatch(gitInfo.remoteUrl)) {
                Logger.writeLine(
                    `Handler '${handler.constructor.name}' is a match.`
                );
                return handler;
            }
        }

        Logger.writeLine(`No handler found.`);
        return undefined;
    }
}
