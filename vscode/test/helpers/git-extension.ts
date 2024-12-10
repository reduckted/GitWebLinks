import { extensions } from 'vscode';

import { GitExtension } from '../../src/api/git';
import { Git } from '../../src/git';

let git: Git | undefined;

/**
 * Gets the Git service for use in tests.
 *
 * @returns The Git service.
 */
export function getGitService(): Git {
    if (!git) {
        let gitExtension: GitExtension | undefined;

        gitExtension = extensions.getExtension<GitExtension>('vscode.git')?.exports;

        if (!gitExtension) {
            throw new Error('Could not find the `vscode.git` extension.');
        }

        git = new Git(gitExtension.getAPI(1));
    }

    return git;
}
