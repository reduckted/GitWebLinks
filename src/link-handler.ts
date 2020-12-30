import { promises as fs, Stats } from 'fs';
import * as path from 'path';

import { git } from './git';
import { RemoteServer, ServerAddress } from './remote-server';
import { HandlerDefinition } from './schema';
import { Settings } from './settings';
import { ParsedTemplate, parseTemplate } from './templates';
import { LinkOptions, LinkType, RepositoryWithRemote } from './types';
import { getErrorMessage, normalizeRemoteUrl } from './utilities';

/**
 * Handles the generation of links for a particular type of Git server.
 */
export class LinkHandler {
    private readonly server: RemoteServer;
    private readonly settings: Settings;
    private readonly urlTemplate: ParsedTemplate;
    private readonly selectionTemplate: ParsedTemplate;

    /**
     * @constructor
     *
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
        return this.server.match(normalizeRemoteUrl(remoteUrl)) !== undefined;
    }

    /**
     * Creates a link for the specified file.
     *
     * @param repository The repository that the file is in.
     * @param filePath The full path to the file.
     * @param options The options for creating the link.
     * @returns The URL.
     */
    public async createUrl(
        repository: RepositoryWithRemote,
        filePath: string,
        options: LinkOptions
    ): Promise<string> {
        let remote: string;
        let address: ServerAddress;
        let type: LinkType;
        let url: string;
        let data: UrlData;

        // If a link type wasn't specified, then we'll use
        // the default type that's defined in the settings.
        type = options.type ?? this.settings.getDefaultLinkType();

        // Adjust the remote URL so that it's in a
        // standard format that we can manipulate.
        remote = normalizeRemoteUrl(repository.remote);

        address = this.getAddress(remote);

        data = {
            base: address.http,
            repository: this.getRepositoryPath(remote, address),
            ref: await this.getRef(type, repository.root),
            commit: await this.getRef('commit', repository.root),
            file: await this.getRelativePath(repository.root, filePath),
            type: type === 'commit' ? 'commit' : 'branch',
            ...options.selection
        };

        url = this.urlTemplate.render(data);

        if (options.selection) {
            url += this.selectionTemplate.render(data);
        }

        return url;
    }

    /**
     * Gets the server address for the given remote URL.
     *
     * @param remote The remote URL.
     * @returns The server address.
     */
    private getAddress(remote: string): ServerAddress {
        let address: ServerAddress | undefined;

        address = this.server.match(remote);

        if (!address) {
            throw new Error('Could not find a matching address.');
        }

        // Normalize the URLs.
        address = {
            http: normalizeRemoteUrl(address.http),
            ssh: address.ssh ? normalizeRemoteUrl(address.ssh) : undefined
        };

        // Remove the trailing slash from the HTTP URL to make it easier
        // for the templates to use it as the base address.
        if (address.http.endsWith('/')) {
            address.http = address.http.slice(0, -1);
        }

        return address;
    }

    /**
     * Gets the path to the repository at the given server address.
     *
     * @param remoteUrl The remote URL of the repository.
     * @param address The address of the server.
     * @returns The path to the repository.
     */
    private getRepositoryPath(remoteUrl: string, address: ServerAddress): string {
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
     * @param repositoryRoot The path to the root of the repository.
     * @returns The ref to use.
     */
    private async getRef(type: LinkType, repositoryRoot: string): Promise<string> {
        switch (type) {
            case 'branch':
                return (await git(repositoryRoot, ...this.definition.branch, 'HEAD')).trim();

            case 'commit':
                return (await git(repositoryRoot, 'rev-parse', 'HEAD')).trim();

            default:
                return this.settings.getDefaultBranch();
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
}

/**
 * Data that is provided to the templates to generate a link.
 */
interface UrlData {
    /**
     * The base URL of the server.
     */
    base: string;

    /**
     * The path to the repository on the server.
     */
    repository: string;

    /**
     * The type of link being generated.
     */
    type: 'branch' | 'commit';

    /**
     * The Git ref to generate the link to. This will be a branch name or commit hash depending on the link type.
     */
    ref: string;

    /**
     * The hash of the current commit.
     */
    commit: string;

    /**
     * The file to generate the link for.
     */
    file: string;

    /**
     * The one-based line number of the start of the selection, if a selection is being included in the link.
     */
    startLine?: number;

    /**
     * The one-based column number of the start of the selection, if a selection is being included in the link.
     */
    startColumn?: number;

    /**
     * The one-based line number of the end of the selection, if a selection is being included in the link.
     */
    endLine?: number;

    /**
     * The one-based column number of the end of the selection, if a selection is being included in the link.
     */
    endColumn?: number;
}
