import { LinkHandler } from './link-handler';
import { log } from './log';
import { load } from './schema';
import { RepositoryWithRemote } from './types';

/**
 * Selects a `LinkHandler` for a repository.
 */
export class LinkHandlerSelector {
    private readonly handlers: LinkHandler[];

    /**
     * @constructor
     */
    constructor() {
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
        log("Finding a handler for repository '%s'.", repository.remote);

        for (let handler of this.handlers) {
            log("Testing '%s'.", handler.name);

            if (handler.isMatch(repository.remote)) {
                log("Handler '%s' is a match.", handler.name);
                return handler;
            }
        }

        log('No handler found.');
        return undefined;
    }
}
