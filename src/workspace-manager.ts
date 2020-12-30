import { Disposable, Uri, workspace, WorkspaceFolder, WorkspaceFoldersChangeEvent } from 'vscode';

import { LinkHandler } from './link-handler';
import { LinkHandlerSelector } from './link-handler-selector';
import { log } from './log';
import { RepositoryFinder } from './repository-finder';
import { Repository } from './types';
import { hasRemote } from './utilities';

/**
 * Tracks the open workspaces and their corresponding repository information.
 */
export class WorkspaceManager extends Disposable {
    private readonly map: Map<string, WorkspaceInfo> = new Map<string, WorkspaceInfo>();
    private readonly disposable: Disposable;

    /**
     * @constructor
     * @param repositoryFinder The `RepositoryFinder` to use.
     * @param handlerSelector The `LinkHandlerSelector` to use.
     * @param onChanged The function to call when workspaces are added or removed.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly handlerSelector: LinkHandlerSelector,
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
        let repository: Repository | undefined;
        let handler: LinkHandler | undefined;

        log("Adding workspace folder '%s'.", folder.uri);

        repository = await this.repositoryFinder.find(folder.uri.fsPath);

        if (repository && hasRemote(repository)) {
            handler = this.handlerSelector.select(repository);
        }

        log('Workspace details: %o', {
            uri: folder.uri.toString(),
            repository: repository ?? '-',
            handler: handler?.name ?? '-'
        });

        this.map.set(folder.uri.toString(), {
            uri: folder.uri,
            repository,
            handler
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

    /**
     * Gets the workspace information for the given workspace folder.
     *
     * @param folder The folder to get the workspace information for.
     * @returns The workspace information if the folder exists; otherwise, `undefined`.
     */
    public get(folder: WorkspaceFolder): WorkspaceInfo | undefined {
        return this.map.get(folder.uri.toString());
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
     * The repository that the workspace is in.
     */
    readonly repository: Repository | undefined;

    /**
     * The link handler for the workspace.
     */
    readonly handler: LinkHandler | undefined;
}

/**
 * A function that is called when workspaces are added or removed.
 *
 * @param workspaces The current set of workspaces.
 */
export type WorkspacesChangedCallback = (workspaces: readonly WorkspaceInfo[]) => void;
