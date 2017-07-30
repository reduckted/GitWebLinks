import { TextEditor, window } from 'vscode';

import { GitInfo } from '../git/GitInfo';
import { LinkHandler } from '../links/LinkHandler';
import { Selection } from '../utilities/Selection';
import { CopyLinkCommand } from './CopyLinkCommand';


export class CopyLinkToSelectionCommand extends CopyLinkCommand {

    constructor(gitInfo: GitInfo, linkHandler: LinkHandler) {
        super('gitweblinks.copySelection', gitInfo, linkHandler);
    }


    protected getLineSelection(): Selection | undefined {
        let editor: TextEditor | undefined;


        editor = window.activeTextEditor;

        if (editor) {
            // The line numbers are zero-based in the
            // editor, but we need them to be one-based.
            return {
                startLine: editor.selection.start.line + 1,
                endLine: editor.selection.end.line + 1
            };
        }

        return undefined;
    }

}
