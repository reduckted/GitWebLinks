import { commands, ExtensionContext, window } from 'vscode';

import { registerCommands } from './command';
import { CONTEXT } from './constants';
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
    let tracker: WorkspaceTracker;
    let repositoryFinder: RepositoryFinder;

    log('Activating extension.');

    if (!(await initialize())) {
        void window.showErrorMessage(STRINGS.extension.gitNotFound);
        return;
    }

    repositoryFinder = new RepositoryFinder();

    tracker = new WorkspaceTracker(repositoryFinder, (workspaces) => {
        // When the workspaces change, update the context
        // for our commands. If any workspaces contain
        // Git repositories, then the command is enabled.
        void commands.executeCommand(
            'setContext',
            CONTEXT.canCopy,
            workspaces.some((x) => x.hasRepositories)
        );
    });

    context.subscriptions.push(tracker);

    registerCommands(context.subscriptions, repositoryFinder, new LinkHandlerSelector());
}
