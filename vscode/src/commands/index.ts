import type { Disposable, Uri } from 'vscode';

import type { Git } from '../git';
import type { LinkHandlerProvider } from '../link-handler-provider';
import type { RepositoryFinder } from '../repository-finder';

import type { GetLinkCommandOptions } from './get-link-command';

import { commands } from 'vscode';

import { COMMANDS } from '../constants';

import { GetLinkCommand } from './get-link-command';
import { GoToFileCommand } from './go-to-file-command';

/**
 * Registers the commands.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerProvider The link handler provider to use.
 * @param git The Git service.
 */
export function registerCommands(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider,
    git: Git
): void {
    registerGetLinkCommands(subscriptions, repositoryFinder, handlerProvider, git);
    registerGoToFileCommand(subscriptions, repositoryFinder, handlerProvider);
}

/**
 * Registers the commands to get links from files.
 *
 * @param subscriptions The subscriptions to add the disposables to.
 * @param repositoryFinder The repository finder to use for finding repository information for a file.
 * @param handlerProvider The link handler selector to use for selecting the handler for a file.
 * @param git The Git service.
 */
export function registerGetLinkCommands(
    subscriptions: Disposable[],
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider,
    git: Git
): void {
    // Add the two commands that appear in the menus to
    // copy a link to a file and copy a link to the selection.
    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copyFile, repositoryFinder, handlerProvider, git, {
            linkType: undefined,
            includeSelection: false,
            action: 'copy'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(COMMANDS.copySelection, repositoryFinder, handlerProvider, git, {
            linkType: undefined,
            includeSelection: true,
            action: 'copy'
        })
    );

    // Add the two commands that appear in the menus to
    // open a link to the file and open a link to the selection.
    subscriptions.push(
        registerGetLinkCommand(COMMANDS.openFile, repositoryFinder, handlerProvider, git, {
            linkType: undefined,
            includeSelection: false,
            action: 'open'
        })
    );

    subscriptions.push(
        registerGetLinkCommand(COMMANDS.openSelection, repositoryFinder, handlerProvider, git, {
            linkType: undefined,
            includeSelection: true,
            action: 'open'
        })
    );

    // And add one command for each of the different link types. These commands don't
    // appear in any menus and can only be run via the command palette (or via shortcut
    // keys). These commands will always include the selection if it's available.
    subscriptions.push(
        registerGetLinkCommand(
            COMMANDS.copySelectionToBranch,
            repositoryFinder,
            handlerProvider,
            git,
            {
                linkType: 'branch',
                includeSelection: true,
                action: 'copy'
            }
        )
    );

    subscriptions.push(
        registerGetLinkCommand(
            COMMANDS.copySelectionToCommit,
            repositoryFinder,
            handlerProvider,
            git,
            {
                linkType: 'commit',
                includeSelection: true,
                action: 'copy'
            }
        )
    );

    subscriptions.push(
        registerGetLinkCommand(
            COMMANDS.copySelectionToDefaultBranch,
            repositoryFinder,
            handlerProvider,
            git,
            {
                linkType: 'defaultBranch',
                includeSelection: true,
                action: 'copy'
            }
        )
    );

    // And add a command where you can choose what to generate the link to.
    subscriptions.push(
        registerGetLinkCommand(
            COMMANDS.copySelectionToChoice,
            repositoryFinder,
            handlerProvider,
            git,
            {
                linkType: 'prompt',
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
 * @param git The Git service.
 * @param options The options for registering the command.
 * @returns A disposable to unregister the command.
 */
function registerGetLinkCommand(
    identifier: string,
    repositoryFinder: RepositoryFinder,
    handlerProvider: LinkHandlerProvider,
    git: Git,
    options: GetLinkCommandOptions
): Disposable {
    let command: GetLinkCommand;

    command = new GetLinkCommand(repositoryFinder, handlerProvider, git, options);

    return commands.registerCommand(identifier, async (resource: Uri | undefined) =>
        command.execute(resource)
    );
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
