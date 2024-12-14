import type { Git } from './git';
import type { RepositoryWithRemote, UrlInfo } from './types';

import { LinkHandler } from './link-handler';
import { log } from './log';
import { load } from './schema';

/**
 * Provides access to the link handlers.
 */
export class LinkHandlerProvider {
    private readonly handlers: readonly LinkHandler[];

    /**
     * @constructor
     * @param git The Git service.
     */
    public constructor(git: Git) {
        this.handlers = load()
            .sort((x, y) => x.name.localeCompare(y.name))
            .map((definition) => new LinkHandler(definition, git));
    }

    /**
     * Selects the link handler to generate links for the given repository.
     *
     * @param repository The repository to select the handler for.
     * @returns The handler to use and the remote URL that was matched, or `undefined` if the repository is not supported.
     */
    public select(repository: RepositoryWithRemote): SelectedLinkHandler | undefined {
        log('Finding a handler for repository %O.', repository.remote);

        for (let handler of this.handlers) {
            log("Testing '%s'.", handler.name);

            for (let url of repository.remote.urls) {
                if (handler.handlesRemoteUrl(url)) {
                    log("Handler '%s' is a match.", handler.name);
                    return { handler, remoteUrl: url };
                }
            }
        }

        log('No handler found.');
        return undefined;
    }

    /**
     * Gets the URL info from the handlers for the given URL.
     *
     * @param url The URL to get the info for.
     * @returns The URL info that was found.
     */
    public getUrlInfo(url: string): UrlInfo[] {
        let output: UrlInfo[];

        log("Finding file info for URL '%s'.", url);
        output = this.internalGetUrlInfo(url, true);

        if (output.length === 0) {
            log('No strict matches found. Trying again with loose matching.');
            output = this.internalGetUrlInfo(url, false);
        }

        return output;
    }

    /**
     * Gets the URL info from the handlers for the given URL using the specified mode.
     *
     * @param url The URL to get the info fo.
     * @param strict Whether to use strict matching.
     * @returns The URL info.
     */
    private internalGetUrlInfo(url: string, strict: boolean): UrlInfo[] {
        let output: UrlInfo[];

        output = [];

        for (let handler of this.handlers) {
            let info: UrlInfo | undefined;

            info = handler.getUrlInfo(url, strict);

            if (info) {
                log("The handler '%s' mapped the file to '%O'.", handler.name, info);
                output.push(info);
            }
        }

        return output;
    }
}

export interface SelectedLinkHandler {
    /**
     * The selected handler.
     */
    readonly handler: LinkHandler;

    /**
     * The remote URL that was used to select the handler.
     */
    readonly remoteUrl: string;
}
