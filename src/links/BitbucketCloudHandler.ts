import * as path from 'path';

import { Git } from '../git/Git';
import { Selection } from '../utilities/Selection';
import { ServerUrl } from '../utilities/ServerUrl';
import { LinkHandler } from './LinkHandler';


export class BitbucketCloudHandler extends LinkHandler {

    private static BITBUCKET_SERVER: ServerUrl = {
        baseUrl: 'https://bitbucket.org',
        sshUrl: 'git@bitbucket.org'
    };


    protected getServerUrls(): ServerUrl[] {
        return [BitbucketCloudHandler.BITBUCKET_SERVER];
    }


    protected async getCurrentBranch(rootDirectory: string): Promise<string> {
        return (await Git.execute(rootDirectory, 'rev-parse', '--abbrev-ref', 'HEAD')).trim();
    }


    protected createUrl(
        baseUrl: string,
        repositoryPath: string,
        branchOrHash: string,
        relativePathToFile: string
    ): string {
        return [baseUrl, repositoryPath, 'src', branchOrHash, relativePathToFile].join('/');
    }


    protected getSelectionHash(filePath: string, selection: Selection): string {
        let hash: string;


        hash = `#${encodeURIComponent(path.basename(filePath))}-${selection.startLine}`;

        if (selection.startLine !== selection.endLine) {
            hash += `:${selection.endLine}`;
        }

        return hash;
    }

}
