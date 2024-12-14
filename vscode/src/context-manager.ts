import type { Git, GitRepository } from './git';

import { commands, Disposable, workspace } from 'vscode';

import { CONFIGURATION, CONTEXT } from './constants';
import { log } from './log';
import { Settings } from './settings';

/**
 * Manages the context for commands.
 */
export class ContextManager extends Disposable {
    private readonly disposable: Disposable;

    /**
     * @constructor
     * @param git The Git service.
     */
    public constructor(git: Git) {
        super(() => {
            this.disposable.dispose();
        });

        this.disposable = Disposable.from(
            // Watch for changes to repositories being opened and closed and
            // update the context that indicates whether there are any repositories.
            git.onDidChangeRepositories(() => {
                this.setHasRepositoriesContext(git.repositories);
            }),
            // When the configuration changes, re-apply the menu item visibility.
            workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(CONFIGURATION.section)) {
                    log('Configuration has changed.');
                    this.applyMenuItemVisibility();
                }
            })
        );

        // Set the current values.
        this.setHasRepositoriesContext(git.repositories);
        this.applyMenuItemVisibility();
    }

    /**
     * Sets the "hasRepositories" context value.
     *
     * @param repositories The current repositories.
     */
    private setHasRepositoriesContext(repositories: readonly GitRepository[]): void {
        this.setContext(CONTEXT.hasRepositories, repositories.length > 0);
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
