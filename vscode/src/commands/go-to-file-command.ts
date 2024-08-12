import { join } from 'path';
import {
    commands,
    env,
    FileStat,
    FileType,
    QuickPickItem,
    Selection,
    TextDocument,
    TextEditor,
    TextLine,
    Uri,
    window,
    workspace
} from 'vscode';

import { LinkHandlerProvider } from '../link-handler-provider';
import { log } from '../log';
import { RemoteServer } from '../remote-server';
import { RepositoryFinder } from '../repository-finder';
import { StaticServer } from '../schema';
import { STRINGS } from '../strings';
import { Repository, SelectedRange, UrlInfo } from '../types';
import { toSelection } from '../utilities';

/**
 * The command to go to the file represented by a URL.
 */
export class GoToFileCommand {
    /**
     * @constructor
     * @param repositoryFinder The repository finder to use for finding repository information for a URL.
     * @param handlerProvider The link handler provider to use.
     */
    constructor(
        private readonly repositoryFinder: RepositoryFinder,
        private readonly handlerProvider: LinkHandlerProvider
    ) {}

    /**
     * Executes the commands.
     */
    public async execute(): Promise<void> {
        let url: string | undefined;

        url = await window.showInputBox({
            prompt: STRINGS.goToFileCommand.inputBoxPrompt,
            value: await this.getInitialUrl(),
            validateInput: (x) => (this.isUrl(x) ? undefined : STRINGS.goToFileCommand.invalidUrl)
        });

        if (url) {
            let info: UrlInfo[];
            let files: MatchedFile[];
            let file: MatchedFile | undefined;

            info = this.handlerProvider.getUrlInfo(url);

            if (info.length === 0) {
                log('No handlers found to handle the URL.');
                void window.showErrorMessage(STRINGS.goToFileCommand.unknownUrl);
                return;
            }

            files = await this.findFiles(info);
            log('Files found: %O', files);

            switch (files.length) {
                case 0:
                    void window.showErrorMessage(STRINGS.goToFileCommand.noFilesFound);
                    return;

                case 1:
                    file = files[0];
                    break;

                default:
                    file = await this.selectFile(files);
                    break;
            }

            if (file) {
                let document: TextDocument | undefined;

                try {
                    document = await workspace.openTextDocument(file.fileName);
                } catch {
                    log(`Unable to open the file '%s' as a text document.`, file.fileName);
                }

                if (document) {
                    let editor: TextEditor;
                    let selection: Selection | undefined;

                    editor = await window.showTextDocument(document);
                    selection = this.createSelection(document, file.selection);

                    if (selection) {
                        log(
                            'Line selection converted to (%d, %d)-(%d, %d)',
                            selection.start.line,
                            selection.start.character,
                            selection.end.line,
                            selection.end.character
                        );
                        editor.selection = selection;
                        editor.revealRange(selection);
                    }
                } else {
                    // The file can't be opened as a text document (it could be an
                    // image, or something similar), so just ask VS Code open it.
                    await commands.executeCommand('vscode.open', Uri.file(file.fileName));
                }
            }
        }
    }

    /**
     * Gets the URL to pre-fill the input box with.
     *
     * @returns The initial URL to use.
     */
    private async getInitialUrl(): Promise<string | undefined> {
        let value: string;

        // Use the contents of the clipboard, but only if it's a valid URL.
        value = await env.clipboard.readText();

        if (this.isUrl(value)) {
            return value;
        }

        return undefined;
    }

    /**
     * Determines whether the given value is a URL.
     *
     * @param value The value to test.
     * @returns True if the value is a URL; otherwise, false.
     */
    private isUrl(value: string): boolean {
        value = value.trim();

        if (!value) {
            return false;
        }

        try {
            return /https?/.test(Uri.parse(value).scheme);
        } catch {
            return false;
        }
    }

    /**
     * Finds the files that correspond to the given URLs.
     *
     * @param urls The information about the URLs to find the files for.
     * @returns The files that were found.
     */
    private async findFiles(urls: UrlInfo[]): Promise<MatchedFile[]> {
        let files: MatchedFile[];
        let uniqueFileNames: Set<string>;
        let matches: MatchedUrlInfo[];

        if (!workspace.workspaceFolders) {
            return [];
        }

        matches = urls.map((info) => ({
            info,
            exactMatch: false,
            repositories: []
        }));

        for (let folder of workspace.workspaceFolders.filter((x) => !!x.uri.fsPath)) {
            await this.findFilesInWorkspace(folder.uri.fsPath, matches);

            // If all URLs have an exact match, then we
            // can stop looking through the workspaces.
            if (matches.every((x) => x.exactMatch)) {
                break;
            }
        }

        files = [];
        uniqueFileNames = new Set<string>();

        // Now use the matching repositories to build the full paths to the files.
        // Note that we don't care about exact matches at this point. The exact
        // matches are just a way to early-exit from finding the repositories.
        for (let match of matches) {
            for (let root of match.repositories) {
                let fileName: string;
                let stat: FileStat | undefined;

                fileName = join(root, match.info.filePath);

                // If there are multiple workspace folders, and two or more of those
                // folders are both within the same repository, then we can end up
                // with duplicate matches because each workspace would map to the same
                // repository. If we've already seen this URI, then we can skip over it.
                if (uniqueFileNames.has(fileName)) {
                    continue;
                }

                uniqueFileNames.add(fileName);
                stat = await this.tryStat(Uri.file(fileName));

                // If the URI exists and is a file, then we can include this match. If the
                // URI doesn't exist, or is some other file system entry (like a directory),
                // then we won't return it because you can't open a directory.
                if (stat?.type === FileType.File) {
                    files.push({ fileName, selection: match.info.selection });
                }
            }
        }

        return files;
    }

    /**
     * Finds the files that correspond to the given URLs in the given workspace.
     *
     * @param folder The workspace folder to search in.
     * @param matches The URL matches to find a repository for.
     */
    private async findFilesInWorkspace(folder: string, matches: MatchedUrlInfo[]): Promise<void> {
        for await (let repository of this.repositoryFinder.findRepositories(folder)) {
            // Look at each URL that we haven't found an exact match for.
            for (let item of matches.filter((x) => !x.exactMatch)) {
                if (this.isMatchingRepository(repository, item.info.server)) {
                    // The URL is an exact match for this repository, so mark it as an
                    // exact match and replace any possible repository matches that were
                    // found previously with this repository that is an exact match.
                    item.exactMatch = true;
                    item.repositories = [repository.root];
                } else {
                    // The URL is not an exact match for this repository, but that could
                    // be because the remote URLs that we determined aren't quite correct,
                    // or perhaps the URL comes from a fork of the repository.
                    //
                    // We'll use the existance of the URI in the repository to determine
                    // whether this repository *could* be a match. If the URI does not exist
                    // in the repository, this this repository is not a match for the URI.
                    //
                    // Note that the inverse is not true - if the URI exists, there is no
                    // guarantee that this is the correct repository, because a file could
                    // be found in many repositories. For example, if the file is "readme.md",
                    // then it's probably in all repositories.
                    if (await this.tryStat(Uri.file(join(repository.root, item.info.filePath)))) {
                        // The URI is in this repository, so record
                        // this repository as a possible match.
                        item.repositories.push(repository.root);
                    }
                }
            }

            // If all URLs now have an exact match, then we
            // can stop looking through the repositories.
            if (matches.every((x) => x.exactMatch)) {
                break;
            }
        }
    }

    /**
     * Determines whether the repository's remote URL matches the given server URLs.
     *
     * @param repository The repository to test.
     * @param server The server URLs to test.
     * @returns True if the repository's remote URL matches the given server URLs.
     */
    private isMatchingRepository(repository: Repository, server: StaticServer): boolean {
        if (repository.remote) {
            if (new RemoteServer(server).match(repository.remote.url)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Attempts to get the stats of the given URI.
     *
     * @param uri The URI to get the stats from.
     * @returns The stats of the URI, or undefined if the URI does not exist.
     */
    private async tryStat(uri: Uri): Promise<FileStat | undefined> {
        try {
            return await workspace.fs.stat(uri);
        } catch {
            return undefined;
        }
    }

    /**
     * Prompts the user to select one of the given files.
     *
     * @param matches The matches to select from.
     * @returns The selected file.
     */
    private async selectFile(matches: MatchedFile[]): Promise<MatchedFile | undefined> {
        let items: QuickPickMatchedFile[];

        items = matches
            .map((file) => ({ label: file.fileName, file }))
            .sort((x, y) => x.label.localeCompare(y.label));

        return (await window.showQuickPick(items))?.file;
    }

    /**
     * Creates a `Selection` from the given range.
     *
     * @param document The document that the selection will be in.
     * @param range The range to create the selection from.
     * @returns The selection, or `undefined` if there is no range.
     */
    private createSelection(
        document: TextDocument,
        range: Partial<SelectedRange>
    ): Selection | undefined {
        let startLine: number;
        let startColumn: number;
        let endLine: number;
        let endColumn: number;
        let startTextLine: TextLine;
        let endTextLine: TextLine;

        // If there's no start line in the range, or the
        // document is empty, then there's nothing to select.
        if (range.startLine === undefined || document.lineCount === 0) {
            return undefined;
        }

        // Coerce the start line to be within the bounds of the document.
        // Note that at this point, the line number is one-based.
        startLine = Math.min(Math.max(range.startLine, 1), document.lineCount);
        startTextLine = document.lineAt(startLine - 1);

        // If there's a start column, start from that position (but don't start from
        // beyond the end of the line); otherwise, start from the start of the line.
        if (range.startColumn !== undefined) {
            startColumn = Math.min(
                Math.max(range.startColumn, 1),
                startTextLine.range.end.character + 1
            );
        } else {
            startColumn = 1;
        }

        if (range.endLine === undefined) {
            // There is no end line, so we'll select the entire start
            // line. Note that at this point, the column number is
            // one-based, whereas the TextLine's position is zero-based.
            endLine = startLine;
        } else {
            // Coerce the end line to be within the bounds of the document.
            // Note that at this point, the line number is one-based.
            endLine = Math.min(Math.max(range.endLine, 1), document.lineCount);
        }

        endTextLine = document.lineAt(endLine - 1);

        // If there's an end column, end at that position (but don't end
        // beyond the end of the line); otherwise, end at the end of the line.
        if (range.endColumn !== undefined) {
            endColumn = Math.min(Math.max(range.endColumn, 1), endTextLine.range.end.character + 1);
        } else {
            endColumn = endTextLine.range.end.character + 1;
        }

        return toSelection({ startLine, startColumn, endLine, endColumn });
    }
}

/**
 * A `QuickPickItem` with an associated `MatchedFile`.
 */
interface QuickPickMatchedFile extends QuickPickItem {
    /**
     * The file information.
     */
    file: MatchedFile;
}

/**
 * `UrlInfo` that has been matched to a repository.
 */
interface MatchedUrlInfo {
    /**
     * The URL info.
     */
    info: UrlInfo;

    /**
     * Indicates whether the info is an exact match to a repository.
     */
    exactMatch: boolean;

    /**
     * The repositories that the URL was matched to.
     */
    repositories: string[];
}

/**
 * A file that a URL was matched to.
 */
interface MatchedFile {
    /**
     * The file name of the file.
     */
    fileName: string;

    /**
     * The range to select in the file.
     */
    selection: Partial<SelectedRange>;
}
