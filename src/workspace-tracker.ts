import { Disposable, Uri, workspace, WorkspaceFolder, WorkspaceFoldersChangeEvent } from 'vscode';

import { log } from './log';
import { RepositoryFinder } from './repository-finder';

/**
 * Tracks the open workspaces and whether they contain repositories.
 */
export class WorkspaceTracker extends Disposable {
    private readonly map: Map<string, WorkspaceInfo> = new Map<string, WorkspaceInfo>();
    private readonly disposable: Disposable;

    /**
     * @constructor
     * @param repositoryFinder The `RepositoryFinder` to use.
     * @param onChanged The function to call when workspaces are added or removed.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly onChanged: WorkspacesChangedCallback
    ) {
        super(() => {
            this.disposable.dispose();
        });

        // Watch for changes to the workspace folders.
        this.disposable = workspace.onDidChangeWorkspaceFolders((e) => {
            this.onWorkspaceFoldersChanged(e);
        });

        // Initialize ourselves with the current workspace folders.
        this.onWorkspaceFoldersChanged({
            added: workspace.workspaceFolders || [],
            removed: []
        });
    }

    /**
     * Handles workspaces being added and removed.
     *
     * @param e The event arguments.
     */
    private onWorkspaceFoldersChanged(e: WorkspaceFoldersChangeEvent): void {
        log('Workspace folders changed: %O', {
            added: e.added.map((x) => x.uri.toString()),
            removed: e.removed.map((x) => x.uri.toString())
        });

        this.addFolders(e.added)
            .then(() => {
                this.removeFolders(e.removed);
                this.onChanged(Array.from(this.map.values()));
            })
            .catch((ex) => log('FAILURE: %s', ex));
    }

    /**
     * Adds the given workspaces folders to the map.
     *
     * @param folders The folders to add.
     */
    private async addFolders(folders: readonly WorkspaceFolder[]): Promise<void> {
        for (let folder of folders) {
            if (folder.uri.fsPath) {
                await this.addFolder(folder);
            } else {
                log("Workspace '%s' ignored because it is not a file path.", folder.uri);
            }
        }
    }

    /**
     * Adds the given folder to the map.
     *
     * @param folder The folder to add.
     */
    private async addFolder(folder: WorkspaceFolder): Promise<void> {
        let hasRepositories: boolean;

        log("Adding workspace folder '%s'.", folder.uri);

        hasRepositories = await this.repositoryFinder.hasRepositories(folder.uri.fsPath);

        log('Workspace details: %o', {
            uri: folder.uri.toString(),
            hasRepositories
        });

        this.map.set(folder.uri.toString(), {
            uri: folder.uri,
            hasRepositories
        });
    }

    /**
     * Removes the given folders from the map.
     *
     * @param folders The folders to remove.
     */
    private removeFolders(folders: readonly WorkspaceFolder[]): void {
        for (let folder of folders) {
            log("Removing workspace folder '%s'.", folder.uri);
            this.map.delete(folder.uri.toString());
        }
    }
}

/**
 * Defined information about a workspace.
 */
export interface WorkspaceInfo {
    /**
     * The URI of the workspace.
     */
    readonly uri: Uri;

    /**
     * Indicates whether the workspace contains one or more repositories.
     */
    readonly hasRepositories: boolean;
}

/**
 * A function that is called when workspaces are added or removed.
 *
 * @param workspaces The current set of workspaces.
 */
export type WorkspacesChangedCallback = (workspaces: readonly WorkspaceInfo[]) => void;
