import { log } from './log';
import { DynamicServer, StaticServer } from './schema';
import { ParsedTemplate, parseTemplate } from './templates';
import { normalizeRemoteUrl } from './utilities';

/**
 * Defines a remote server that can be matched to a Git remote URL.
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
     * Tests if this server is a match for the remote URL.
     *
     * @param remoteUrl The remote URL to test against.
     * @returns The server address if the remote URL is a match; otherwise, `undefined`.
     */
    public match(remoteUrl: string): ServerAddress | undefined {
        for (let matcher of this.matchers) {
            let server: ServerAddress | undefined;

            server = matcher(remoteUrl);

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

    return (remote) => {
        let match: RegExpMatchArray | null;

        match = pattern.exec(remote);

        if (match) {
            // The remote URL matched the pattern. Render the templates to get the
            // HTTP and SSH URLs, making the match available for the templates to use.
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
    return (remote) => (isMatch(remote, server) ? server : undefined);
}

/**
 * Determines whether the given remote URL matches the given server definition.
 *
 * @param remote The remote URL.
 * @param server The server definition.
 * @returns True if the remote URL matches the server; otherwise, false.
 */
function isMatch(remote: string, server: StaticServer): boolean {
    remote = normalizeRemoteUrl(remote);

    if (remote.startsWith(normalizeRemoteUrl(server.http))) {
        return true;
    }

    if (server.ssh && remote.startsWith(normalizeRemoteUrl(server.ssh))) {
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
    return (remote) => {
        let servers: StaticServer[];

        servers = factory();

        for (let server of servers) {
            if (isMatch(remote, server)) {
                return server;
            }
        }

        return undefined;
    };
}

type StaticServerFactory = () => StaticServer[];

type Matcher = (remoteUrl: string) => ServerAddress | undefined;

/**
 * Defines the address of a server.
 */
export interface ServerAddress {
    /**
     * The address of the server for HTTP/HTTPS URLs.
     */
    http: string;

    /**
     * The address of the server for SSH URLs.
     */
    ssh: string | undefined;
}
