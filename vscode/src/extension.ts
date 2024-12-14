import type { Disposable, ExtensionContext } from 'vscode';

import type { GitExtension } from './api/git';

import { extensions, window } from 'vscode';

import { registerCommands } from './commands';
import { ContextManager } from './context-manager';
import { Git } from './git';
import { LinkHandlerProvider } from './link-handler-provider';
import { log } from './log';
import { RepositoryFinder } from './repository-finder';
import { STRINGS } from './strings';

/**
 * Activates the extension.
 *
 * @param context The extension's context.
 */
export function activate(context: ExtensionContext): void {
    let gitExtension: GitExtension | undefined;

    log('Activating extension.');

    gitExtension = extensions.getExtension<GitExtension>('vscode.git')?.exports;

    if (!gitExtension) {
        log('Could not find the `vscode.git` extension.');
        void window.showErrorMessage(STRINGS.extension.gitExtensionNotFound);
        return;
    }

    if (gitExtension.enabled) {
        initialize(context, gitExtension);
    } else {
        let enabledListener: Disposable;

        log('The `vscode.git` extension is disabled. Waiting for it to become enabled.');

        enabledListener = gitExtension.onDidChangeEnablement((enabled) => {
            if (enabled) {
                log('The `vscode.git` extension is now enabled.');
                initialize(context, gitExtension);
                enabledListener.dispose();
            }
        });
    }
}

/**
 * Initializes the extension.
 *
 * @param context The extension's context.
 * @param extension The `vscode.git` extension.
 */
function initialize(context: ExtensionContext, extension: GitExtension): void {
    let repositoryFinder: RepositoryFinder;
    let git: Git;

    git = new Git(extension.getAPI(1));

    repositoryFinder = new RepositoryFinder(git);

    context.subscriptions.push(new ContextManager(git));

    registerCommands(context.subscriptions, repositoryFinder, new LinkHandlerProvider(git), git);
}
