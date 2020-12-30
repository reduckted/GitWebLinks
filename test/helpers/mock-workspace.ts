import { Disposable, Uri, WorkspaceFolder, WorkspaceFoldersChangeEvent } from 'vscode';

/**
 * Mock implementation of a workspace.
 */
export class MockWorkspace {
    private readonly callbacks: ((e: WorkspaceFoldersChangeEvent) => Promise<void>)[] = [];

    /**
     * The workspace folders.
     */
    public workspaceFolders: WorkspaceFolder[] | undefined;

    /**
     * Registeres a callback to be called when the workspace folders are changed.
     *
     * @param callback The callback.
     * @returns A disposable to unregister the callback.
     */
    public onDidChangeWorkspaceFolders(
        callback: (e: WorkspaceFoldersChangeEvent) => Promise<void>
    ): Disposable {
        this.callbacks.push(callback);
        return { dispose: () => this.callbacks.splice(this.callbacks.indexOf(callback)) };
    }

    /**
     * Adds a workspace.
     *
     * @param uri The URI of the workspace.
     * @returns The workspace folder that was added.
     */
    public async add(uri: Uri): Promise<WorkspaceFolder> {
        let folder: WorkspaceFolder;

        if (!this.workspaceFolders) {
            this.workspaceFolders = [];
        }

        folder = { index: 0, uri, name: '' };

        this.workspaceFolders.push(folder);

        for (let callback of this.callbacks) {
            await callback({ added: [folder], removed: [] });
        }

        return folder;
    }

    /**
     * Removes a workspace.
     *
     * @param uri The URI of the workspace.
     */
    public async remove(uri: Uri): Promise<void> {
        let index: number;

        if (!this.workspaceFolders) {
            return;
        }

        index = this.workspaceFolders.findIndex((x) => x.uri.toString() === uri.toString());

        if (index >= 0) {
            let folder: WorkspaceFolder;

            folder = this.workspaceFolders[index];
            this.workspaceFolders.splice(index, 1);

            for (let callback of this.callbacks) {
                await callback({ added: [], removed: [folder] });
            }
        }
    }
}
