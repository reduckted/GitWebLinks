import { commands, ExtensionContext, window } from 'vscode';

import { registerCommands } from './command';
import { CONTEXT } from './constants';
import { initialize } from './git';
import { LinkHandlerSelector } from './link-handler-selector';
import { log } from './log';
import { RepositoryFinder } from './repository-finder';
import { STRINGS } from './strings';
import { WorkspaceManager } from './workspace-manager';

/**
 * Activates the extension.
 *
 * @param context The extension's context.
 */
export async function activate(context: ExtensionContext): Promise<void> {
    let manager: WorkspaceManager;

    log('Activating extension.');

    if (!(await initialize())) {
        void window.showErrorMessage(STRINGS.extension.gitNotFound);
        return;
    }

    manager = new WorkspaceManager(
        new RepositoryFinder(),
        new LinkHandlerSelector(),
        (workspaces) => {
            // When the workspaces change, update the context
            // for our commands. If any workspaces are in a
            // Git repository, then the command is enabled.
            void commands.executeCommand(
                'setContext',
                CONTEXT.canCopy,
                workspaces.filter((x) => !!x.repository).length > 0
            );
        }
    );

    context.subscriptions.push(manager);

    registerCommands(context.subscriptions, manager);
}
