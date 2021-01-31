import { commands, env, MessageItem, TextEditor, Uri, window } from 'vscode';

import { LinkHandler } from '../link-handler';
import { LinkHandlerSelector } from '../link-handler-selector';
import { log } from '../log';
import { RepositoryFinder } from '../repository-finder';
import { STRINGS } from '../strings';
import { LinkType, Repository, RepositoryWithRemote, SelectedRange } from '../types';
import { hasRemote, toSelectedRange } from '../utilities';

/**
 * The command to get a URL from a file.
 */
export class GetLinkCommand {
    /**
     * @constructor
     * @param repositoryFinder The repository finder to use for finding repository information for a file.
     * @param handlerSelector The link handler selector to use for selecing the handler for a file.
     * @param options The options that control how the command behaves.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly handlerSelector: LinkHandlerSelector,
        private readonly options: GetLinkCommandOptions
    ) {}

    /**
     * Executes the commands.
     *
     * @param resource The resource that the command was invoked from.
     */
    public async execute(resource: Uri | undefined): Promise<void> {
        let editor: TextEditor | undefined;
        let info: ResourceInfo | undefined;

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
            void window.showErrorMessage(STRINGS.getLinkCommand.noFileSelected);
            return;
        }

        info = await this.getResourceInfo(resource);

        if (info) {
            let selection: SelectedRange | undefined;

            if (this.options.includeSelection) {
                // We are allowed to include the selection, but we can only get the
                // selection from the active editor, so we'll only include the selection
                // if the file we are generating the link for is in the active editor.
                if (resource.toString() === editor?.document.uri.toString()) {
                    selection = toSelectedRange(editor.selection);
                    log('Line selection: %o', selection);
                }
            }

            try {
                let link: string;

                link = await info.handler.createUrl(
                    info.repository,
                    { filePath: info.uri.fsPath, selection },
                    { type: this.options.linkType }
                );

                log('Web link created: %s', link);

                switch (this.options.action) {
                    case 'copy':
                        await env.clipboard.writeText(link);

                        void window
                            .showInformationMessage<ActionMessageItem>(
                                STRINGS.getLinkCommand.linkCopied(info.handler.name),
                                {
                                    title: STRINGS.getLinkCommand.openInBrowser,
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
                void window.showErrorMessage(STRINGS.getLinkCommand.error);
            }
        }
    }

    /**
     * Gets information about a resource.
     *
     * @param resource The URI of the resource to get the info for.
     * @returns The resource information.
     */
    private async getResourceInfo(resource: Uri): Promise<ResourceInfo | undefined> {
        let repository: Repository | undefined;
        let handler: LinkHandler | undefined;

        repository = await this.repositoryFinder.findRepository(resource.fsPath);

        if (!repository) {
            log('File is not tracked by Git.');
            void window.showErrorMessage(STRINGS.getLinkCommand.notTrackedByGit(resource));
            return undefined;
        }

        if (!hasRemote(repository)) {
            log('Repository does not have a remote.');
            void window.showErrorMessage(STRINGS.getLinkCommand.noRemote(repository.root));
            return undefined;
        }

        handler = this.handlerSelector.select(repository);

        if (!handler) {
            log("No handler for remote '%s'.", repository.remote);
            void window
                .showErrorMessage<ActionMessageItem>(
                    STRINGS.getLinkCommand.noHandler(repository.remote),
                    {
                        title: STRINGS.getLinkCommand.openSettings,
                        action: 'settings'
                    }
                )
                .then((x) => this.onNotificationItemClick(x));
            return undefined;
        }

        return { uri: resource, repository, handler };
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
 * Options for controling the behaviouor of the command.
 */
export interface GetLinkCommandOptions {
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
    action: 'copy' | 'open';
}

/**
 * Defines information about a resource to generate a web link for.
 */
interface ResourceInfo {
    /**
     * The URI of the resource.
     */
    uri: Uri;

    /**
     * The repository that the resource is in.
     */
    readonly repository: RepositoryWithRemote;

    /**
     * The link handler for the resource.
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
