import { WorkspaceFolder } from 'vscode';

import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { WorkspaceData } from './WorkspaceData';


interface WorkspaceItem {
    folder: WorkspaceFolder;
    data: WorkspaceData;
}


export class WorkspaceMap {

    private items: WorkspaceItem[] = [];


    public add(folder: WorkspaceFolder, gitInfo: GitInfo, handler: LinkHandler) {
        this.items.push({ folder, data: { gitInfo, handler } });
    }


    public remove(folder: WorkspaceFolder) {
        let index: number;


        index = this.items.map((x) => x.folder).indexOf(folder);

        if (index >= 0) {
            this.items.splice(index, 1);
        }
    }


    public get(folder: WorkspaceFolder): WorkspaceData | undefined {
        return this.items.filter((x) => x.folder === folder).map((x) => x.data)[0];
    }


    public isEmpty(): boolean {
        return this.items.length === 0;
    }

}
