import { commands, Disposable, workspace } from 'vscode';

import { CONFIGURATION, CONTEXT } from './constants';
import { log } from './log';
import { Settings } from './settings';
import { WorkspaceInfo, WorkspaceTracker } from './workspace-tracker';

/**
 * Manages the context for commands.
 */
export class ContextManager extends Disposable {
    private readonly disposable: Disposable;

    /**
     * @constructor
     * @param workspaceTracker The workspace tracker to observe.
     */
    public constructor(workspaceTracker: WorkspaceTracker) {
        super(() => {
            this.disposable.dispose();
        });

        this.disposable = Disposable.from(
            // When the workspaces change, update the context that
            // indicates whether any workspaces have a repository.
            workspaceTracker.onWorkspacesChanged((workspaces) => {
                this.sethasRepositoriesContext(workspaces);
            }),
            // When the configuration changes, re-apply the menu item visibility.
            workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(CONFIGURATION.section)) {
                    log('Configuration has changed.');
                    this.applyMenuItemVisibility();
                }
            })
        );

        this.setContext(
            CONTEXT.hasRepositories,
            workspaceTracker.workspaces.some((x) => x.hasRepositories)
        );

        // Set the current values.
        // this.sethasRepositoriesContext(workspaceTracker.workspaces);
        this.applyMenuItemVisibility();
    }

    /**
     * Sets the "hasRepositories" context value.
     *
     * @param workspaces The current workspaces.
     */
    private sethasRepositoriesContext(workspaces: readonly WorkspaceInfo[]): void {
        this.setContext(
            CONTEXT.hasRepositories,
            workspaces.some((x) => x.hasRepositories)
        );
    }

    /**
     * Sets the context that is used to control the visibility of menu items.
     */
    private applyMenuItemVisibility(): void {
        let settings: Settings;

        settings = new Settings();

        void commands.executeCommand('setContext', CONTEXT.canCopy, settings.getShowCopy());
        void commands.executeCommand('setContext', CONTEXT.canOpen, settings.getShowOpen());
    }

    /**
     * Sets the value of the specified context.
     *
     * @param name The name of the context.
     * @param value The value of the context.
     */
    private setContext(name: string, value: unknown): void {
        void commands.executeCommand('setContext', name, value);
    }
}
