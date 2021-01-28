import { commands, Disposable, env, MessageItem, TextEditor, Uri, window } from 'vscode';

import { COMMANDS } from './constants';
import { LinkHandler } from './link-handler';
import { LinkHandlerSelector } from './link-handler-selector';
import { log } from './log';
import { RepositoryFinder } from './repository-finder';
import { STRINGS } from './strings';
import { LinkType, Repository, RepositoryWithRemote, Selection } from './types';
import { hasRemote } from './utilities';

/**
 * The command to copy a web link to a file.
 */
export class Command {
    /**
     * @constructor
     * @param repositoryFinder The repository finder to use for finding repository information for a file.
     * @param handlerSelector The link handler selector to use for selecing the handler for a file.
     * @param linkType The type of links to generate. A value of `undefined` means the settings will be used to determine the type.
     * @param includeSelection Indicates whether the current selected range should be included in the links.
     * @param action The action that the command should perform with the link.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly handlerSelector: LinkHandlerSelector,
        private readonly linkType: LinkType | undefined,
        private readonly includeSelection: boolean,
        private readonly action: CommandAction
    ) {}

    /**
     * Executes the commands.
     *
     * @param resource The resource that the command was invoked from.
     */
    public async execute(resource: Uri | undefined): Promise<void> {
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
            void window.showErrorMessage(STRINGS.command.noFileSelected);
            return;
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

                switch (this.action) {
                    case 'copy':
                        await env.clipboard.writeText(link);

                        void window
                            .showInformationMessage<ActionMessageItem>(
                                STRINGS.command.linkCopied(file.handler.name),
                                {
                                    title: STRINGS.command.openInBrowser,
                                    action: 'open'
                                }
                            )
                            .then((x) => this.onNotificationItemClick(x, link));

                        break;

                    case 'open':
                        void env.openExternal(Uri.parse(link));
                }
            } catch (ex) {
                log('Error while generating a link: %o', ex);
                void window.showErrorMessage(STRINGS.command.error);
            }
        }
    }

    /**
     * Gets information about the specified file.
     *
     * @param file The URI of the file to get the info for.
     * @returns The file information.
     */
    private async getFileInfo(file: Uri): Promise<FileInfo | undefined> {
        let repository: Repository | undefined;
        let handler: LinkHandler | undefined;

        repository = await this.repositoryFinder.find(file.fsPath);

        if (!repository) {
            log('File is not tracked by Git.');
            void window.showErrorMessage(STRINGS.command.notTrackedByGit(file));
            return undefined;
        }

        if (!hasRemote(repository)) {
            log('Repository does not have a remote.');
            void window.showErrorMessage(STRINGS.command.noRemote(repository.root));
            return undefined;
        }

        handler = this.handlerSelector.select(repository);

        if (!handler) {
            log("No handler for remote '%s'.", repository.remote);
            void window
                .showErrorMessage<ActionMessageItem>(STRINGS.command.noHandler(repository.remote), {
                    title: 'Open Settings',
                    action: 'settings'
                })
                .then((x) => this.onNotificationItemClick(x));
            return undefined;
        }

        return { uri: file, repository, handler };
    }

    /**
     * Gets the range that is selected in the given text editor.
     *
     * @param editor The editor to get the selection from.
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

    /**
     * Handles a button on a notification being clicked.
     *
     * @param item The item that was clicked on.
     * @param link The link that has been created.
     */
    private onNotificationItemClick(item: ActionMessageItem | undefined, link?: string): void {
        switch (item?.action) {
            case 'settings':
                void commands.executeCommand('workbench.action.openSettings', 'gitweblinks');
                break;

            case 'open':
                if (link) {
                    void env.openExternal(Uri.parse(link));
                }
                break;
        }
    }
}

/**
 * Registers the commands.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerSelector The link handler selector to use for selecing the handler for a file.
 */
export function registerCommands(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerSelector: LinkHandlerSelector
): void {
    // Add the two commands that appear in the menus to
    // copy a link to a file and copy a link to the selection.
    subscriptions.push(
        register(COMMANDS.copyFile, repositoryFinder, handlerSelector, {
            linkType: undefined,
            includeSelection: false,
            action: 'copy'
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelection, repositoryFinder, handlerSelector, {
            linkType: undefined,
            includeSelection: true,
            action: 'copy'
        })
    );

    // Add the two commands that appear in the menus to
    // open a link to the file and open a link to the selection.
    subscriptions.push(
        register(COMMANDS.openFile, repositoryFinder, handlerSelector, {
            linkType: undefined,
            includeSelection: false,
            action: 'open'
        })
    );

    subscriptions.push(
        register(COMMANDS.openSelection, repositoryFinder, handlerSelector, {
            linkType: undefined,
            includeSelection: true,
            action: 'open'
        })
    );

    // And add one command for each of the different link types. These commands don't
    // appear in any menus and can only be run via the command palette (or via shortcut
    // keys). These commands will always include the selection if it's available.
    subscriptions.push(
        register(COMMANDS.copySelectionToBranch, repositoryFinder, handlerSelector, {
            linkType: 'branch',
            includeSelection: true,
            action: 'copy'
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelectionToCommit, repositoryFinder, handlerSelector, {
            linkType: 'commit',
            includeSelection: true,
            action: 'copy'
        })
    );

    subscriptions.push(
        register(COMMANDS.copySelectionToDefaultBranch, repositoryFinder, handlerSelector, {
            linkType: 'defaultBranch',
            includeSelection: true,
            action: 'copy'
        })
    );
}

/**
 * Registers a command.
 *
 * @param identifier The command identifier.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerSelector The link handler selector to use for selecing the handler for a file.
 * @param options The options for registering the command.
 * @returns A disposable to unregister the command.
 */
export function register(
    identifier: string,
    repositoryFinder: RepositoryFinder,
    handlerSelector: LinkHandlerSelector,
    options: CommandOptions
): Disposable {
    let command: Command;

    command = new Command(
        repositoryFinder,
        handlerSelector,
        options.linkType,
        options.includeSelection,
        options.action
    );

    return commands.registerCommand(identifier, async (resource) => command.execute(resource));
}

/**
 * Indicates whether a command should copy the link or open the link.
 */
type CommandAction = 'copy' | 'open';

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

    /**
     * The action the command should perform.
     */
    action: CommandAction;
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

/**
 * Defines a message item with an associated action.
 */
interface ActionMessageItem extends MessageItem {
    /**
     * The action to perform.
     */
    action: 'settings' | 'open';
}
