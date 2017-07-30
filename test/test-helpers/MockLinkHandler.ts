import { GitInfo } from '../../src/git/GitInfo';
import { LinkHandler } from '../../src/links/LinkHandler';
import { Selection } from '../../src/utilities/Selection';
import { ServerUrl } from '../../src/utilities/ServerUrl';


const BASE_URL: string = 'http://foo';
const SSH_URL: string = 'git@foo';


export const GIT_INFO: GitInfo = { rootDirectory: 'Z:\\', remoteUrl: `${BASE_URL}/meep` };
export const FINAL_URL: string = 'the url';


export class MockLinkHandler extends LinkHandler {

    public selection: Selection | undefined;


    protected getServerUrls(): ServerUrl[] {
        return [{ baseUrl: BASE_URL, sshUrl: SSH_URL }];
    }


    protected getCurrentBranch(rootDirectory: string): Promise<string> {
        return Promise.resolve('foo');
    }


    protected createUrl(baseUrl: string, repositoryPath: string, branch: string, relativePathToFile: string): string {
        return FINAL_URL;
    }


    protected getSelectionHash(filePath: string, selection: Selection): string {
        this.selection = selection;
        return '';
    }

}
