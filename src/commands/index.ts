import { commands, Disposable } from 'vscode';

import { COMMANDS } from '../constants';
import { LinkHandlerProvider } from '../link-handler-provider';
import { RepositoryFinder } from '../repository-finder';

import { GetLinkCommand, GetLinkCommandOptions } from './get-link-command';
import { GoToFileCommand } from './go-to-file-command';

/**
 * Registers the commands.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerProvider The link handler provider to use.
 */
export function registerCommands(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider
): void {
    registerGetLinkCommands(subscriptions, repositoryFinder, handlerProvider);
    registerGoToFileCommand(subscriptions, repositoryFinder, handlerProvider);
}

/**
 * Registers the commands to get links from files.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerProvider The link handler selector to use for selecing the handler for a file.
 */
export function registerGetLinkCommands(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider
): void {
    // Add the two commands that appear in the menus to
    // copy a link to a file and copy a link to the selection.
    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copyFile, repositoryFinder, handlerProvider, {
            linkType: undefined,
            includeSelection: false,
            action: 'copy'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copySelection, repositoryFinder, handlerProvider, {
            linkType: undefined,
            includeSelection: true,
            action: 'copy'
        })
    );

    // Add the two commands that appear in the menus to
    // open a link to the file and open a link to the selection.
    subscriptions.push(
        registerGetLinkCommand(COMMANDS.openFile, repositoryFinder, handlerProvider, {
            linkType: undefined,
            includeSelection: false,
            action: 'open'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(COMMANDS.openSelection, repositoryFinder, handlerProvider, {
            linkType: undefined,
            includeSelection: true,
            action: 'open'
        })
    );

    // And add one command for each of the different link types. These commands don't
    // appear in any menus and can only be run via the command palette (or via shortcut
    // keys). These commands will always include the selection if it's available.
    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copySelectionToBranch, repositoryFinder, handlerProvider, {
            linkType: 'branch',
            includeSelection: true,
            action: 'copy'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copySelectionToCommit, repositoryFinder, handlerProvider, {
            linkType: 'commit',
            includeSelection: true,
            action: 'copy'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(
            COMMANDS.copySelectionToDefaultBranch,
            repositoryFinder,
            handlerProvider,
            {
                linkType: 'defaultBranch',
                includeSelection: true,
                action: 'copy'
            }
        )
    );
}

/**
 * Registers a command to get a link from a file.
 *
 * @param identifier The command identifier.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerProvider The link handler provider to use.
 * @param options The options for registering the command.
 * @returns A disposable to unregister the command.
 */
function registerGetLinkCommand(
    identifier: string,
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider,
    options: GetLinkCommandOptions
): Disposable {
    let command: GetLinkCommand;

    command = new GetLinkCommand(repositoryFinder, handlerProvider, options);

    return commands.registerCommand(identifier, async (resource) => command.execute(resource));
}

/**
 * Registers the command to go to the file represented by a URL.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a URL.
 * @param handlerProvider The link handler provider to use.
 */
function registerGoToFileCommand(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider
): void {
    let command: GoToFileCommand;

    command = new GoToFileCommand(repositoryFinder, handlerProvider);

    subscriptions.push(commands.registerCommand(COMMANDS.goToFile, async () => command.execute()));
}
