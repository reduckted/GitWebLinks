import { Disposable, Uri, WorkspaceFolder, WorkspaceFoldersChangeEvent } from 'vscode';

export class MockWorkspace {
    private readonly callbacks: ((e: WorkspaceFoldersChangeEvent) => Promise<void>)[] = [];

    public workspaceFolders: WorkspaceFolder[] | undefined;

    public onDidChangeWorkspaceFolders(
        callback: (e: WorkspaceFoldersChangeEvent) => Promise<void>
    ): Disposable {
        this.callbacks.push(callback);
        return { dispose: () => this.callbacks.splice(this.callbacks.indexOf(callback)) };
    }

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
