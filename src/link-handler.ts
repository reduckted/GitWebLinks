import { promises as fs, Stats } from 'fs';
import * as path from 'path';
import { URL } from 'url';

import { git } from './git';
import { NoRemoteHeadError } from './no-remote-head-error';
import { RemoteServer } from './remote-server';
import {
    HandlerDefinition,
    ReverseSelectionSettings,
    ReverseServerSettings,
    StaticServer
} from './schema';
import { Settings } from './settings';
import { ParsedTemplate, parseTemplate } from './templates';
import {
    FileInfo,
    LinkOptions,
    LinkType,
    RepositoryWithRemote,
    SelectedRange,
    UrlInfo
} from './types';
import { getErrorMessage, normalizeUrl } from './utilities';

/**
 * Handles the generation of links for a particular type of Git server.
 */
export class LinkHandler {
    private readonly server: RemoteServer;
    private readonly settings: Settings;
    private readonly urlTemplate: ParsedTemplate;
    private readonly selectionTemplate: ParsedTemplate;
    private readonly reverse: ParsedReverseSettings;
    private readonly queryModifications: ParsedQueryModification[];

    /**
     * @constructor
     * @param definition The details of the handler.
     */
    constructor(private readonly definition: HandlerDefinition) {
        this.settings = new Settings();

        if ('private' in definition) {
            this.server = new RemoteServer(() => this.settings.getServers(definition.private));
        } else {
            this.server = new RemoteServer(definition.server);
        }

        this.urlTemplate = parseTemplate(definition.url);
        this.selectionTemplate = parseTemplate(definition.selection);

        this.queryModifications =
            definition.query?.map((x) => ({
                pattern: new RegExp(x.pattern),
                key: x.key,
                value: x.value
            })) ?? [];

        this.reverse = {
            // The regular expression can be defined as an array of strings.
            // This is just a convenience to allow the pattern to be
            // split over multiple lines in the JSON definition file.
            // Join all of the parts together to create the complete pattern.
            pattern: new RegExp(
                typeof definition.reverse.pattern === 'string'
                    ? definition.reverse.pattern
                    : definition.reverse.pattern.join('')
            ),
            file: parseTemplate(definition.reverse.file),
            server: {
                http: parseTemplate(definition.reverse.server.http),
                ssh: parseTemplate(definition.reverse.server.ssh)
            },
            selection: {
                startLine: parseTemplate(definition.reverse.selection.startLine),
                endLine: parseTemplate(definition.reverse.selection.endLine),
                startColumn: parseTemplate(definition.reverse.selection.startColumn),
                endColumn: parseTemplate(definition.reverse.selection.endColumn)
            }
        };
    }

    /**
     * The name of the handler.
     */
    public get name(): string {
        return this.definition.name;
    }

    /**
     * Determines whether this handler can generate links for the given remote URL.
     *
     * @param remoteUrl The remote URL to check.
     * @returns True if this handler handles the given remote URL; otherwise, false.
     */
    public isMatch(remoteUrl: string): boolean {
        return this.server.match(normalizeUrl(remoteUrl)) !== undefined;
    }

    /**
     * Creates a link for the specified file.
     *
     * @param repository The repository that the file is in.
     * @param file The details of the file.
     * @param options The options for creating the link.
     * @returns The URL.
     */
    public async createUrl(
        repository: RepositoryWithRemote,
        file: FileInfo,
        options: LinkOptions
    ): Promise<string> {
        let remote: string;
        let address: StaticServer;
        let type: LinkType;
        let url: string;
        let data: UrlData;

        // If a link type wasn't specified, then we'll use
        // the default type that's defined in the settings.
        type = options.type ?? this.settings.getDefaultLinkType();

        // Adjust the remote URL so that it's in a
        // standard format that we can manipulate.
        remote = normalizeUrl(repository.remote.url);

        address = this.getAddress(remote);

        data = {
            base: address.http,
            repository: this.getRepositoryPath(remote, address),
            ref: await this.getRef(type, repository),
            commit: await this.getRef('commit', repository),
            file: await this.getRelativePath(repository.root, file.filePath),
            type: type === 'commit' ? 'commit' : 'branch',
            ...file.selection
        };

        url = this.urlTemplate.render(data);

        if (file.selection) {
            url += this.selectionTemplate.render(data);
        }

        url = this.applyModifications(
            url,
            this.queryModifications.filter((x) => x.pattern.test(file.filePath))
        );

        return url;
    }

    /**
     * Applies the given query string modifications to the URL.
     *
     * @param url The URL to modify.
     * @param modifications The modifications to apply.
     * @returns The modified URL.
     */
    private applyModifications(url: string, modifications: ParsedQueryModification[]): string {
        if (modifications.length > 0) {
            let u: URL;

            u = new URL(url);

            for (let modification of modifications) {
                u.searchParams.append(modification.key, modification.value);
            }

            url = u.toString();
        }

        return url;
    }

    /**
     * Gets the server address for the given remote URL.
     *
     * @param remote The remote URL.
     * @returns The server address.
     */
    private getAddress(remote: string): StaticServer {
        let address: StaticServer | undefined;

        address = this.server.match(remote);

        if (!address) {
            throw new Error('Could not find a matching address.');
        }

        return this.normalizeServerUrls(address);
    }

    /**
     * Normalizes the server URLs to make them consistent for use in the templates.
     *
     * @param address The server address to normalize.
     * @returns The normalized server URLs.
     */
    private normalizeServerUrls(address: StaticServer): StaticServer {
        let http: string;
        let ssh: string | undefined;

        http = normalizeUrl(address.http);
        ssh = address.ssh ? normalizeUrl(address.ssh) : undefined;

        return { http, ssh };
    }

    /**
     * Gets the path to the repository at the given server address.
     *
     * @param remoteUrl The remote URL of the repository.
     * @param address The address of the server.
     * @returns The path to the repository.
     */
    private getRepositoryPath(remoteUrl: string, address: StaticServer): string {
        let repositoryPath: string;

        // Remove the server's address from the start of the URL.
        // Note that the remote URL and both URLs in the server
        // address have been normalized by this point.
        if (remoteUrl.startsWith(address.http)) {
            repositoryPath = remoteUrl.substring(address.http.length);
        } else {
            repositoryPath = address.ssh ? remoteUrl.substring(address.ssh.length) : '';
        }

        // The server address we matched against may not have ended
        // with a slash (for HTTPS paths) or a colon (for SSH paths),
        // which means the path might start with that. Trim that off now.
        if (repositoryPath.length > 0) {
            if (repositoryPath[0] === '/' || repositoryPath[0] === ':') {
                repositoryPath = repositoryPath.substring(1);
            }
        }

        if (repositoryPath.endsWith('.git')) {
            repositoryPath = repositoryPath.substring(0, repositoryPath.length - 4);
        }

        return repositoryPath;
    }

    /**
     * Gets the ref to use when creating the link.
     *
     * @param type The type of ref to get.
     * @param repository The repository.
     * @returns The ref to use.
     */
    private async getRef(type: LinkType, repository: RepositoryWithRemote): Promise<string> {
        switch (type) {
            case 'branch':
                return (
                    await git(
                        repository.root,
                        'rev-parse',
                        this.getRevParseOutputArgument(),
                        'HEAD'
                    )
                ).trim();
            case 'commit':
                return (await git(repository.root, 'rev-parse', 'HEAD')).trim();

            default:
                // Use the default branch if one is specified in the settings; otherwise find the
                // name of the default branch by getting the name of the "remote_name/HEAD" ref.
                return (
                    this.settings.getDefaultBranch() ||
                    (await this.getDefaultRemoteBranch(repository))
                );
        }
    }

    /**
     * Gets the name of the default branch in the remote.
     *
     * @param repository The repository.
     * @returns The name of the default branch.
     */
    private async getDefaultRemoteBranch(repository: RepositoryWithRemote): Promise<string> {
        let branch: string;

        try {
            branch = (
                await git(
                    repository.root,
                    'rev-parse',
                    this.getRevParseOutputArgument(),
                    `${repository.remote.name}/HEAD`
                )
            ).trim();
        } catch (ex) {
            throw new NoRemoteHeadError(getErrorMessage(ex));
        }

        switch (this.definition.branchRef) {
            case 'abbreviated':
                // The branch name will be "remote_name/branch_name",
                // but we only want the "branch_name" part.
                return branch.slice(repository.remote.name.length + 1);

            case 'symbolic':
                // The branch name will be "refs/remotes/remote_name/branch_name",
                // but we want it to be "refs/heads/branch_name".
                return branch.replace(
                    new RegExp(`^refs\\/remotes\\/${this.escapeRegExp(repository.remote.name)}\\/`),
                    'refs/heads/'
                );

            default:
                return branch;
        }
    }

    /**
     * Escapes a value that can then be used in a Regular Expression.
     *
     * @param value The value to escape.
     * @returns The escaped value.
     */
    private escapeRegExp(value: string): string {
        return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    }

    /**
     * Gets the argument to use with `git rev-parse` to specify the output.
     *
     * @returns The argument to use.
     */
    private getRevParseOutputArgument(): string {
        switch (this.definition.branchRef) {
            case 'symbolic':
                return '--symbolic-full-name';

            default:
                return '--abbrev-ref';
        }
    }

    /**
     * Gets the relative path from the specified directory to the specified file.
     *
     * @param from The directory to get the relative path from.
     * @param to The file to get the relative path to.
     * @returns The relative path of the file.
     */
    private async getRelativePath(from: string, to: string): Promise<string> {
        // If the file is a symbolic link, or is under a directory that's a
        // symbolic link, then we want to resolve the path to the real file
        // because the sybmolic link won't be in the Git repository.
        if (await this.isSymbolicLink(to, from)) {
            try {
                to = await fs.realpath(to);

                // Getting the real path of the file resolves all symbolic links,
                // which means if the repository is also under a symbolic link,
                // then the new file path may no longer be under the root directory.
                // We can fix this by also getting the real path of the root directory.
                from = await fs.realpath(from);
            } catch (ex) {
                // Provide a nicer error message that
                // explains what we were trying to do.
                throw new Error(
                    `Unable to resolve the symbolic link '${to}' to a real path.\n${getErrorMessage(
                        ex
                    )}`
                );
            }
        }

        // Get the relative path, then normalize
        // the separators to forward slashes.
        return path.relative(from, to).replace(/\\/g, '/');
    }

    /**
     * Determines whether the specified file is a symbolic link.
     *
     * @param filePath The path of the file to check.
     * @param rootDirectory The path to the root of the repository.
     * @returns True if the specified file is a symbolic link within the repository; otherwise, false.
     */
    private async isSymbolicLink(filePath: string, rootDirectory: string): Promise<boolean> {
        // Check if the file is a symbolic link. If it isn't, then walk up
        // the tree to see if an ancestor directory is a symbolic link. Keep
        // stepping up until we reach the root directory of the repository,
        // because we only need to resolve symbolic links within the repository.
        // If the entire repository is under a symbolic link, then we don't
        // want to resolve paths to somewhere outside the repository.
        while (filePath !== rootDirectory) {
            let stats: Stats;
            let parent: string;

            try {
                stats = await fs.lstat(filePath);
            } catch (ex) {
                // Assume that the path isn't a symbolic link.
                return false;
            }

            if (stats.isSymbolicLink()) {
                return true;
            }

            parent = path.dirname(filePath);

            if (parent === filePath) {
                // We can't go any higher, so the
                // path cannot be a symbolic link.
                return false;
            }

            filePath = parent;
        }

        return false;
    }

    /**
     * Gets information about the given URL.
     *
     * @param url The URL to get the information from.
     * @param strict Whether to require the URL to match the server address of the handler.
     * @returns The URL information, or `undefined` if the information could not be determined.
     */
    public getUrlInfo(url: string, strict: boolean): UrlInfo | undefined {
        let address: StaticServer | undefined;
        let match: RegExpExecArray | null;

        // See if the URL matches the server address for the handler.
        address = this.server.match(url);

        // If we are performing a strict match, then the
        // URL must match to this handler's server.
        if (strict && !address) {
            return undefined;
        }

        if (address) {
            address = this.normalizeServerUrls(address);
        }

        match = this.reverse.pattern.exec(url);

        if (match) {
            let data: FileData;
            let file: string;
            let server: StaticServer;
            let selection: Partial<SelectedRange> | undefined;

            data = {
                match,
                http: address?.http,
                ssh: address?.ssh
            };

            file = this.reverse.file.render(data);

            server = {
                http: this.reverse.server.http.render(data),
                ssh: this.reverse.server.ssh.render(data)
            };

            selection = {
                startLine: this.tryParseNumber(this.reverse.selection.startLine.render(data)),
                endLine: this.tryParseNumber(this.reverse.selection.endLine?.render(data)),
                startColumn: this.tryParseNumber(this.reverse.selection.startColumn?.render(data)),
                endColumn: this.tryParseNumber(this.reverse.selection.endColumn?.render(data))
            };

            return { filePath: file, server, selection };
        }

        return undefined;
    }

    /**
     * Attempts to parse the given value to a number.
     *
     * @param value The value to parse.
     * @returns The value as a number, or `undefined` if the value could not be parsed.
     */
    private tryParseNumber(value: string | undefined): number | undefined {
        if (value !== undefined) {
            let num: number;

            num = parseInt(value, 10);

            if (!isNaN(num)) {
                return num;
            }
        }

        return undefined;
    }
}

/**
 * Data that is provided to the templates to generate a link.
 */
interface UrlData {
    /**
     * The base URL of the server.
     */
    readonly base: string;

    /**
     * The path to the repository on the server.
     */
    readonly repository: string;

    /**
     * The type of link being generated.
     */
    readonly type: 'branch' | 'commit';

    /**
     * The Git ref to generate the link to. This will be a branch name or commit hash depending on the link type.
     */
    readonly ref: string;

    /**
     * The hash of the current commit.
     */
    readonly commit: string;

    /**
     * The file to generate the link for.
     */
    readonly file: string;

    /**
     * The one-based line number of the start of the selection, if a selection is being included in the link.
     */
    readonly startLine?: number;

    /**
     * The one-based column number of the start of the selection, if a selection is being included in the link.
     */
    readonly startColumn?: number;

    /**
     * The one-based line number of the end of the selection, if a selection is being included in the link.
     */
    readonly endLine?: number;

    /**
     * The one-based column number of the end of the selection, if a selection is being included in the link.
     */
    readonly endColumn?: number;
}

interface FileData {
    readonly match: RegExpMatchArray;

    readonly http?: string;

    readonly ssh?: string;
}

/**
 * The parsed query modification for making modifications to the URL's query string.
 */
export interface ParsedQueryModification {
    /**
     * The regular expression to match against the file name.
     */
    readonly pattern: RegExp;

    /**
     * The key to add to the query string when the pattern matches.
     */
    readonly key: string;

    /**
     * The value to add to the query string when the pattern matches.
     */
    readonly value: string;
}

/**
 * The parsed settings for getting file information from a URL.
 */
interface ParsedReverseSettings {
    /**
     * The regular expression pattern to match against the URL.
     */
    readonly pattern: RegExp;

    /**
     * The template to produce a file name.
     */
    readonly file: ParsedTemplate;

    /**
     * The templates that provide the base remote URLs.
     */
    readonly server: ParsedTemplates<ReverseServerSettings>;

    /**
     * The templates that provide the selection range.
     */
    readonly selection: ParsedTemplates<ReverseSelectionSettings>;
}

/**
 * Parsed templates.
 */
type ParsedTemplates<T> = { [K in keyof T]: ParsedTemplate };
