import {
    commands,
    Disposable,
    env,
    TextEditor,
    Uri,
    window,
    workspace,
    WorkspaceFolder
} from 'vscode';
import { COMMANDS } from './constants';
import { LinkHandler } from './link-handler';
import { log } from './log';
import { STRINGS } from './strings';
import { LinkType, Repository, RepositoryWithRemote, Selection } from './types';
import { hasRemote } from './utilities';
import { WorkspaceInfo, WorkspaceManager } from './workspace-manager';

/**
 * The command to copy a web link to a file.
 */
export class Command {
    /**
     * @constructor
     * @param workspaces The workspace manager to use for finding repository information.
     * @param linkType The type of links to generate. A value of `undefined` means the settings will be used to determine the type.
     * @param includeSelection Indicates whether the current selected range should be included in the links.
     */
    constructor(
        private readonly workspaces: WorkspaceManager,
        private readonly linkType: LinkType | undefined,
        private readonly includeSelection: boolean
    ) {}

    /**
     * Executes the commands.
     * @param resource The resource that the command was invoked from.
     */
    public async execute(resource: Uri | undefined): Promise<any> {
        let editor: TextEditor | undefined;
        let file: FileInfo | undefined;

        log('Executing command.');

        editor = window.activeTextEditor;

        // When the command is run from a menu, the resource parameter refers
        // to the file that the menu was opened from. When the command is run
        // from the command palette or via a keyboard shortcut, there won't be a
        // resource. In those cases we will use the document in the active editor.
        if (!resource) {
            resource = editor?.document.uri;
        }

        if (resource?.scheme !== 'file') {
            log("File URI scheme is '%s'.", resource?.scheme);
            return window.showErrorMessage(STRINGS.command.noFileSelected);
        }

        file = await this.getFileInfo(resource);

        if (file) {
            let selection: Selection | undefined;

            if (this.includeSelection) {
                // We are allowed to include the selection, but we can only get the
                // selection from the active editor, so we'll only include the selection
                // if the file we are generating the link for is in the active editor.
                if (resource.toString() === editor?.document.uri.toString()) {
                    selection = this.getLineSelection(editor);
                    log('Line selection: %o', selection);
                }
            }

            try {
                let link: string;

                link = await file.handler.createUrl(file.repository, file.uri.fsPath, {
                    type: this.linkType,
                    selection
                });

                log('Web link created: %s', link);
                await env.clipboard.writeText(link);
                window.showInformationMessage(STRINGS.command.linkCopied(file.handler.name));
            } catch (ex) {
                log('Error while generating a link: %o', ex);
                window.showErrorMessage(STRINGS.command.error);
            }
        }
    }

    private async getFileInfo(file: Uri): Promise<FileInfo | undefined> {
        let folder: WorkspaceFolder | undefined;
        let workspaceInfo: WorkspaceInfo | undefined;
        let repository: Repository | undefined;

        folder = workspace.getWorkspaceFolder(file);

        if (!folder) {
            log("The file '%s' is not in a workspace.", file);
            window.showErrorMessage(STRINGS.command.fileNotInWorkspace(file));
            return;
        }

        log("The file '%s' is in the workspace '%s'.", file, folder?.uri);

        workspaceInfo = this.workspaces.get(folder);

        if (!workspaceInfo) {
            log('No workspace information found.');
            window.showErrorMessage(STRINGS.command.noWorkspaceInfo(folder.uri));
            return;
        }

        repository = workspaceInfo.repository;

        if (!repository) {
            log('File is not tracked by Git.');
            window.showErrorMessage(STRINGS.command.notTrackedByGit(folder.uri));
            return;
        }

        if (!hasRemote(repository)) {
            log('Repository does not have a remote.');
            window.showErrorMessage(STRINGS.command.noRemote(repository.root));
            return;
        }

        if (!workspaceInfo.handler) {
            log("No handler for remote '%s'.", repository.remote);
            window.showErrorMessage(STRINGS.command.noHandler(repository.remote));
            return;
        }

        return {
            uri: file,
            repository,
            handler: workspaceInfo.handler
        };
    }

    /**
     * Gets the range that is selected in the given text editor.
     * @returns The selection.
     */
    private getLineSelection(editor: TextEditor): Selection {
        // The line numbers are zero-based in the
        // editor, but we need them to be one-based.
        return {
            startLine: editor.selection.start.line + 1,
            endLine: editor.selection.end.line + 1,
            startColumn: editor.selection.start.character + 1,
            endColumn: editor.selection.end.character + 1
        };
    }
}

/**
 * Registers the commands.
 * @param subscriptions The subscriptions to add the disposables to.
 * @param workspaceManager The workspace manager.
 */
export function registerCommands(
    subscriptions: Disposable[],
    workspaceManager: WorkspaceManager
): void {
    // Add the two commands that appear in the menus to
    // copy a link to a file and copy a link to the selection.
    subscriptions.push(
        register(COMMANDS.copyFile, workspaceManager, {
            linkType: undefined,
            includeSelection: false
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelection, workspaceManager, {
            linkType: undefined,
            includeSelection: true
        })
    );

    // And add one command for each of the different link types. These commands don't
    // appear in any menus and can only be run via the command palette (or via shortcut
    // keys). These commands will always include the selection if it's available.
    subscriptions.push(
        register(COMMANDS.copySelectionToBranch, workspaceManager, {
            linkType: 'branch',
            includeSelection: true
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelectionToCommit, workspaceManager, {
            linkType: 'commit',
            includeSelection: true
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelectionToDefaultBranch, workspaceManager, {
            linkType: 'defaultBranch',
            includeSelection: true
        })
    );
}

/**
 *
 * @param identifier The command identifier.
 * @param workspaceManager The workspace mamnager for the command to use.
 * @param options The options for registering the command.
 */
export function register(
    identifier: string,
    workspaceManager: WorkspaceManager,
    options: CommandOptions
): Disposable {
    let command: Command;

    command = new Command(workspaceManager, options.linkType, options.includeSelection);

    return commands.registerCommand(identifier, command.execute, command);
}

/**
 * Options for registering a command.
 */
interface CommandOptions {
    /**
     * The type of link the command will prodice (`undefined` means
     * the command will use the settings to determine the link type).
     */
    linkType: LinkType | undefined;

    /**
     * Whether to include the selection region
     * from the file in the link that is generated.
     */
    includeSelection: boolean;
}

/**
 * Defines information about a file to generate a web link for.
 */
interface FileInfo {
    /**
     * The URI of the file.
     */
    uri: Uri;

    /**
     * The repository that the file is in.
     */
    readonly repository: RepositoryWithRemote;

    /**
     * The link handler for the file.
     */
    readonly handler: LinkHandler;
}
