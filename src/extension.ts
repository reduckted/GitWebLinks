import { commands, ExtensionContext, window } from 'vscode';

import { CONTEXT } from './constants';
import { initialize } from './git';
import { log } from './log';
import { WorkspaceManager } from './workspace-manager';
import { RepositoryFinder } from './repository-finder';
import { registerCommands } from './command';
import { LinkHandlerSelector } from './link-handler-selector';
import { STRINGS } from './strings';

/**
 * Activates the extension.
 * @param context The extension's context.
 */
export async function activate(context: ExtensionContext): Promise<void> {
    let manager: WorkspaceManager;

    log('Activating extension.');

    if (!(await initialize())) {
        window.showErrorMessage(STRINGS.extension.gitNotFound);
        return;
    }

    manager = new WorkspaceManager(
        new RepositoryFinder(),
        new LinkHandlerSelector(),
        (workspaces) => {
            // When the workspaces change, update the context
            // for our commands. If any workspaces are in a
            // Git repository, then the command is enabled.
            commands.executeCommand(
                'setContext',
                CONTEXT.canCopy,
                workspaces.filter((x) => !!x.repository).length > 0
            );
        }
    );

    context.subscriptions.push(manager);

    registerCommands(context.subscriptions, manager);
}
