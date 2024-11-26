import { LinkHandler } from './link-handler';
import { log } from './log';
import { load } from './schema';
import { RepositoryWithRemote, UrlInfo } from './types';

/**
 * Provides access to the link handlers.
 */
export class LinkHandlerProvider {
    private readonly handlers: readonly LinkHandler[];

    /**
     * @constructor
     */
    public constructor() {
        this.handlers = load()
            .sort((x, y) => x.name.localeCompare(y.name))
            .map((definition) => new LinkHandler(definition));
    }

    /**
     * Selects the link handler to generate links for the given repository.
     *
     * @param repository The repository to select the handler for.
     * @returns The handler to use, or `undefined` if the repository is not supported.
     */
    public select(repository: RepositoryWithRemote): LinkHandler | undefined {
        log('Finding a handler for repository %O.', repository.remote);

        for (let handler of this.handlers) {
            log("Testing '%s'.", handler.name);

            if (handler.handlesRemoteUrl(repository.remote.url)) {
                log("Handler '%s' is a match.", handler.name);
                return handler;
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
