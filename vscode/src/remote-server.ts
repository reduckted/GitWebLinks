import { log } from './log';
import { DynamicServer, StaticServer } from './schema';
import { ParsedTemplate, parseTemplate } from './templates';
import { normalizeUrl } from './utilities';

/**
 * Defines a remote server that can be matched to a Git server URL.
 */
export class RemoteServer {
    private readonly matchers: Matcher[];

    /**
     * @constructor
     * @param servers The server definitions to use when matching.
     */
    constructor(
        servers:
            | StaticServer
            | DynamicServer
            | (StaticServer | DynamicServer)[]
            | StaticServerFactory
    ) {
        if (typeof servers === 'function') {
            this.matchers = [createLazyStaticServerMatcher(servers)];
        } else {
            if (!Array.isArray(servers)) {
                servers = [servers];
            }

            this.matchers = servers.map(createMatcher);
        }
    }

    /**
     * Tests if this server is a match for the given URL.
     *
     * @param url The URL to test against.
     * @returns The server address if the URL is a match; otherwise, `undefined`.
     */
    public match(url: string): StaticServer | undefined {
        for (let matcher of this.matchers) {
            let server: StaticServer | undefined;

            server = matcher(url);

            if (server) {
                return server;
            }
        }

        return undefined;
    }
}

/**
 * Creates a matcher function for the given server definition.
 *
 * @param server The server definition.
 * @returns The matcher function.
 */
function createMatcher(server: StaticServer | DynamicServer): Matcher {
    if ('pattern' in server) {
        return createDynamicServerMatcher(server);
    } else {
        return createStaticServerMatcher(server);
    }
}

/**
 * Creates a matcher function for the given dynamic server definition.
 *
 * @param server The server definition.
 * @returns The matcher for the server.
 */
function createDynamicServerMatcher(server: DynamicServer): Matcher {
    let pattern: RegExp;
    let httpTemplate: ParsedTemplate;
    let sshTemplate: ParsedTemplate;

    // The pattern is a regular expression, so parse
    // it once instead of each time we execute.
    try {
        pattern = new RegExp(server.pattern);
    } catch (ex) {
        log("Invalid dynamic server pattern '%s': %s", server.pattern, ex);
        return () => undefined;
    }

    // Parse the templates now so we don't
    // have to do it each time we execute.
    httpTemplate = parseTemplate(server.http);
    sshTemplate = parseTemplate(server.ssh);

    return (url) => {
        let match: RegExpMatchArray | null;

        match = pattern.exec(url);

        if (match) {
            // The URL matched the pattern. Render the templates to get the HTTP
            // and SSH URLs, making the match available for the templates to use.
            return {
                http: httpTemplate.render({ match }),
                ssh: sshTemplate.render({ match })
            };
        }

        return undefined;
    };
}

/**
 * Creates a matcher function for the given static server definition.
 *
 * @param server The server definition.
 * @returns The matcher function.
 */
function createStaticServerMatcher(server: StaticServer): Matcher {
    return (url) => (isMatch(url, server) ? server : undefined);
}

/**
 * Determines whether the given URL matches the given server definition.
 *
 * @param url The URL.
 * @param server The server definition.
 * @returns True if the URL matches the server; otherwise, false.
 */
function isMatch(url: string, server: StaticServer): boolean {
    url = normalizeUrl(url);

    if (url.startsWith(normalizeUrl(server.http))) {
        return true;
    }

    if (server.ssh && url.startsWith(normalizeUrl(server.ssh))) {
        return true;
    }

    return false;
}

/**
 * Creates a matcher function that fetches the static server definitions when invoked.
 *
 * @param factory The function to get the server definitions.
 * @returns The matcher function.
 */
function createLazyStaticServerMatcher(factory: StaticServerFactory): Matcher {
    return (url) => {
        let servers: StaticServer[];

        servers = factory();

        for (let server of servers) {
            if (isMatch(url, server)) {
                return server;
            }
        }

        return undefined;
    };
}

type StaticServerFactory = () => StaticServer[];

type Matcher = (url: string) => StaticServer | undefined;
