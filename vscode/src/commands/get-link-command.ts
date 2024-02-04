import {
    commands,
    env,
    MessageItem,
    QuickPickItem,
    QuickPickItemKind,
    Range,
    TextEditor,
    Uri,
    window
} from 'vscode';

import { git } from '../git';
import { CreateUrlResult, LinkHandler } from '../link-handler';
import { LinkHandlerProvider } from '../link-handler-provider';
import { log } from '../log';
import { NoRemoteHeadError } from '../no-remote-head-error';
import { RepositoryFinder } from '../repository-finder';
import { Settings } from '../settings';
import { STRINGS } from '../strings';
import {
    LinkFormat,
    LinkTarget,
    LinkType,
    Repository,
    RepositoryWithRemote,
    SelectedRange
} from '../types';
import { getErrorMessage, getSelectedRange, hasRemote } from '../utilities';

/**
 * The command to get a URL from a file.
 */
export class GetLinkCommand {
    private readonly settings: Settings;

    /**
     * @constructor
     * @param repositoryFinder The repository finder to use for finding repository information for a file.
     * @param handlerProvider The provider of link handlers.
     * @param options The options that control how the command behaves.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly handlerProvider: LinkHandlerProvider,
        private readonly options: GetLinkCommandOptions
    ) {
        this.settings = new Settings();
    }

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
                    selection = getSelectedRange(editor);
                    log('Line selection: %o', selection);
                }
            }

            try {
                let target: LinkTarget | undefined;
                let result: CreateUrlResult;

                if (this.options.linkType === 'prompt') {
                    target = await this.promptForLinkTarget(info);

                    if (target === undefined) {
                        return;
                    }
                } else {
                    target = { preset: this.options.linkType };
                }

                result = await info.handler.createUrl(
                    info.repository,
                    { filePath: info.uri.fsPath, selection },
                    { target }
                );

                log('Web link created: %s', result.url);

                switch (this.options.action) {
                    case 'copy':
                        {
                            let formats: Record<LinkFormat, string>;
                            let format: LinkFormat;
                            let actions: ActionMessageItem[];
                            let copiedText: string;

                            // Create all of the formats, because whichever
                            // formats we don't copy to the clipboard, we'll
                            // offer to copy in the notification that we show.
                            formats = {
                                raw: result.url,
                                markdown: createMarkdownLink(result),
                                markdownWithPreview:
                                    createMarkdownLink(result) +
                                    // Only include the preview if the
                                    // selection was included in the link.
                                    (editor && selection
                                        ? `\n${getCodeBlockForSelection(editor, selection)}`
                                        : '')
                            };

                            format = this.settings.getLinkFormat();
                            copiedText = formats[format];
                            await env.clipboard.writeText(copiedText);

                            actions = [
                                {
                                    title: STRINGS.getLinkCommand.openInBrowser,
                                    action: 'open'
                                }
                            ];

                            // If we didn't copy the raw link, add an action to copy it.
                            if (copiedText !== formats.raw) {
                                actions.push({
                                    title: STRINGS.getLinkCommand.copyAsRawUrl,
                                    action: 'copy-raw'
                                });
                            }

                            // If we didn't copy the markdown link, add an action to copy it. Note that
                            // we check the actual copied text rather than the format that was used, because
                            // the format can be "markdownWithPreview" but we might not include the preview,
                            // which causes what we copied to be the same as the basic markdown link.
                            if (copiedText !== formats.markdown) {
                                actions.push({
                                    title:
                                        format === 'markdownWithPreview' &&
                                        formats.markdown !== formats.markdownWithPreview
                                            ? STRINGS.getLinkCommand
                                                  .copyAsMarkdownLinkWithoutPreview
                                            : STRINGS.getLinkCommand.copyAsMarkdownLink,
                                    action: 'copy-markdown'
                                });
                            }

                            // If we didn't copy the markdown link with a preview,
                            // add an action to copy it, but only if the text
                            // will be different to the plain markdown link.
                            if (
                                copiedText !== formats.markdownWithPreview &&
                                formats.markdownWithPreview !== formats.markdown
                            ) {
                                actions.push({
                                    title: STRINGS.getLinkCommand.copyAsMarkdownLinkWithPreview,
                                    action: 'copy-markdown-with-preview'
                                });
                            }

                            void window
                                .showInformationMessage<ActionMessageItem>(
                                    STRINGS.getLinkCommand.linkCopied(info.handler.name),
                                    ...actions
                                )
                                .then((x) => this.onNotificationItemClick(x, formats));
                        }
                        break;

                    case 'open':
                        openExternal(result.url);
                }
            } catch (ex) {
                log('Error while generating a link: %o', ex);

                if (ex instanceof NoRemoteHeadError) {
                    void window.showErrorMessage(
                        STRINGS.getLinkCommand.noRemoteHead(
                            info.repository.root,
                            info.repository.remote.name
                        )
                    );
                } else {
                    void window.showErrorMessage(STRINGS.getLinkCommand.error);
                }
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

        handler = this.handlerProvider.select(repository);

        if (!handler) {
            log("No handler for remote '%s'.", repository.remote);
            void window
                .showErrorMessage<ActionMessageItem>(
                    STRINGS.getLinkCommand.noHandler(repository.remote.url),
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
     * Prompts the user to select the target of the link that will be created.
     *
     * @param info The info for the resource that the link will be created for.
     * @returns The target, or undefined to cancel the operation.
     */
    private async promptForLinkTarget(info: ResourceInfo): Promise<LinkTarget | undefined> {
        let items: (QuickPickLinkTargetItem | QuickPickItem)[];
        let selection: QuickPickLinkTargetItem | QuickPickItem | undefined;

        items = [
            ...(await this.getPresetTargetItems(info)),
            ...(await this.getRefTargetItems(info))
        ];

        selection = await window.showQuickPick(items, {
            placeHolder: 'What would you like to create the link to?',
            matchOnDescription: true
        });

        if (selection && 'target' in selection) {
            return selection?.target;
        }

        return undefined;
    }

    /**
     * Gets the quick pick items for the preset targets.
     *
     * @param info The info for the resource that the link will be created for.
     * @returns The quick pick items for the preset targets.
     */
    private async getPresetTargetItems(info: ResourceInfo): Promise<QuickPickLinkTargetItem[]> {
        let targets: string[];
        let items: { item: QuickPickLinkTargetItem; default: boolean }[];
        let defaultType: LinkType;

        // Get the refs in parallel.
        targets = await Promise.all([
            this.tryGetRef(info, 'branch'),
            this.tryGetRef(info, 'commit'),
            this.tryGetRef(info, 'defaultBranch')
        ]);

        defaultType = this.settings.getDefaultLinkType();

        items = [
            {
                item: {
                    label: 'Current branch',
                    description: targets[0],
                    target: { preset: 'branch' }
                },
                default: defaultType === 'branch'
            },
            {
                item: {
                    label: 'Current commit',
                    description: targets[1],
                    target: { preset: 'commit' }
                },
                default: defaultType === 'commit'
            },
            {
                item: {
                    label: 'Default branch',
                    description: targets[2],
                    target: { preset: 'defaultBranch' }
                },
                default: defaultType === 'defaultBranch'
            }
        ];

        // Sort the presets so that the default link type is at
        // the top. This will cause it to be the initial selection.
        return items
            .sort((a, b) =>
                a.default ? -1 : b.default ? 1 : a.item.label.localeCompare(b.item.label)
            )
            .map((x) => x.item);
    }

    /**
     * Attempts to get the ref for the specified link type.
     *
     * @param info The resource info.
     * @param type The type of link to get the ref for.
     * @returns The ref, or an empty string if it could not be retrieved.
     */
    private async tryGetRef(info: ResourceInfo, type: LinkType): Promise<string> {
        try {
            return await info.handler.getRef(type, info.repository);
        } catch (ex) {
            log("Error when getting ref for link type '%s': %s", type, getErrorMessage(ex));
            return '';
        }
    }

    /**
     * Gets the quick pick items for the ref targets.
     *
     * @param info The info for the resource that the link will be created for.
     * @returns The quick pick items for the ref targets.
     */
    private async getRefTargetItems(
        info: ResourceInfo
    ): Promise<(QuickPickLinkTargetItem | QuickPickItem)[]> {
        let branches: (QuickPickLinkTargetItem | QuickPickItem)[];
        let commits: (QuickPickLinkTargetItem | QuickPickItem)[];
        let lines: string[];
        let useShortHashes: boolean;

        lines = (
            await git(
                info.repository.root,
                'branch',
                '--list',
                '--no-color',
                '--format',
                '%(refname:short) %(refname) %(objectname:short) %(objectname)'
            )
        )
            .split(/\r?\n/)
            .filter((x) => x.length > 0);

        branches = [];
        commits = [];
        useShortHashes = this.settings.getUseShortHash();

        for (let line of lines) {
            let [branchName, branchRef, shortHash, fullHash] = line.split(' ');

            branches.push({
                label: branchName,
                description: useShortHashes ? shortHash : fullHash,
                target: { ref: { abbreviated: branchName, symbolic: branchRef }, type: 'branch' }
            });

            commits.push({
                label: useShortHashes ? shortHash : fullHash,
                description: branchName,
                target: { ref: { abbreviated: shortHash, symbolic: fullHash }, type: 'commit' }
            });
        }

        branches.sort((x, y) => x.label.localeCompare(y.label));
        commits.sort((x, y) => x.label.localeCompare(y.label));

        return [
            { label: 'Branches', kind: QuickPickItemKind.Separator },
            ...branches,
            { label: 'Commits', kind: QuickPickItemKind.Separator },
            ...commits
        ];
    }

    /**
     * Handles a button on a notification being clicked.
     *
     * @param item The item that was clicked on.
     * @param linkFormats The formatted links that have been created.
     */
    private onNotificationItemClick(
        item: ActionMessageItem | undefined,
        linkFormats?: Record<LinkFormat, string>
    ): void {
        switch (item?.action) {
            case 'settings':
                void commands.executeCommand('workbench.action.openSettings', 'gitweblinks');
                break;

            case 'open':
                if (linkFormats) {
                    openExternal(linkFormats.raw);
                }
                break;

            case 'copy-raw':
                if (linkFormats) {
                    void env.clipboard.writeText(linkFormats.raw);
                }
                break;

            case 'copy-markdown':
                if (linkFormats) {
                    void env.clipboard.writeText(linkFormats.markdown);
                }
                break;

            case 'copy-markdown-with-preview':
                if (linkFormats) {
                    void env.clipboard.writeText(linkFormats.markdownWithPreview);
                }
                break;
        }
    }
}

/**
 * Creates a markdown-formatted link for the URL that was created.
 *
 * @param result The result of creating the link.
 * @returns The markdown link.
 */
function createMarkdownLink(result: CreateUrlResult): string {
    return `[${result.relativePath}${result.selection ?? ''}](${result.url})`;
}

/**
 * Creates a markdown code block for the lines specified in the given selection.
 *
 * @param editor The editor to get the text from.
 * @param selection The selection to use in the code block.
 * @returns The markdown code block.
 */
function getCodeBlockForSelection(editor: TextEditor, selection: SelectedRange): string {
    let text: string;

    // Always get complete lines, so start from character zero on the start line.
    // To get the full end line, we need to get the text up to the start
    // of the next line. We can then trim off the line break. Note that the
    // given selection uses one-based lines, so we need to subtract one from
    // the start and end lines when getting the text.
    text = editor.document
        .getText(new Range(selection.startLine - 1, 0, selection.endLine, 0))
        .replace(/\r?\n$/, '');

    return `\`\`\`${editor.document.languageId}\n${text}\n\`\`\``;
}

/**
 * A wrapper around `env.openExternal()` to handle a bug in VS Code.
 *
 * @param link The link to open.
 */
function openExternal(link: string): void {
    try {
        // @ts-expect-error: VS Code seems to decode and re-encode the URI, which causes certain
        // characters to be unescaped and breaks the URL. A a hack, we can try passing a string
        // instead of a URI. If that throws an error, then we'll fall back to passing a URI.
        // https://github.com/microsoft/vscode/issues/85930
        void env.openExternal(link);
    } catch {
        void env.openExternal(Uri.parse(link));
    }
}

/**
 * Options for controling the behaviouor of the command.
 */
export interface GetLinkCommandOptions {
    /**
     * The type of link the command will produce, or 'prompt' to ask the user which ref to use a function to get the
     * link type, or `undefined` to use the settings to determine the link type).
     */
    linkType: LinkType | 'prompt' | undefined;

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
 * An quick pick item for selecting a link target.
 */
interface QuickPickLinkTargetItem extends QuickPickItem {
    /**
     * The target that the item represents.
     */
    readonly target: LinkTarget;
}

/**
 * Defines a message item with an associated action.
 */
interface ActionMessageItem extends MessageItem {
    /**
     * The action to perform.
     */
    action: 'settings' | 'open' | 'copy-raw' | 'copy-markdown' | 'copy-markdown-with-preview';
}
