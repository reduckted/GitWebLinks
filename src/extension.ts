import { ExtensionContext, window } from 'vscode';

import { registerCommands } from './commands';
import { ContextManager } from './context-manager';
import { initialize } from './git';
import { LinkHandlerSelector } from './link-handler-selector';
import { log } from './log';
import { RepositoryFinder } from './repository-finder';
import { STRINGS } from './strings';
import { WorkspaceTracker } from './workspace-tracker';

/**
 * Activates the extension.
 *
 * @param context The extension's context.
 */
export async function activate(context: ExtensionContext): Promise<void> {
    let repositoryFinder: RepositoryFinder;
    let workspaceTracker: WorkspaceTracker;

    log('Activating extension.');

    if (!(await initialize())) {
        void window.showErrorMessage(STRINGS.extension.gitNotFound);
        return;
    }

    repositoryFinder = new RepositoryFinder();
    workspaceTracker = new WorkspaceTracker(repositoryFinder);

    context.subscriptions.push(new ContextManager(workspaceTracker));
    context.subscriptions.push(workspaceTracker);

    registerCommands(context.subscriptions, repositoryFinder, new LinkHandlerSelector());
}
