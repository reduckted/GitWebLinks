import type { DynamicServer, StaticServer } from './schema';
import type { ParsedTemplate } from './templates';
import type { Mutable } from './types';

import { log } from './log';
import { parseTemplate } from './templates';
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
    public constructor(
        servers:
            | (DynamicServer | StaticServer)[]
            | DynamicServer
            | StaticServer
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
     * Tests if this server is a match for the given remote URL.
     *
     * @param remoteUrl The remote URL to test against.
     * @returns The server address if the URL is a match; otherwise, `undefined`.
     */
    public matchRemoteUrl(remoteUrl: string): StaticServer | undefined {
        return this.matchUrl(remoteUrl, (x) => x.remote);
    }

    /**
     * Tests if this server is a match for the given web interface URL.
     *
     * @param webUrl The web interface URL to test against.
     * @returns The server address if the URL is a match; otherwise, `undefined`.
     */
    public matchWebUrl(webUrl: string): StaticServer | undefined {
        return this.matchUrl(webUrl, (x) => x.web);
    }

    /**
     * Tests if this server is a match for the given URL.
     *
     * @param url The URL to test against.
     * @param selectUrlMatcher A function to select the matcher to use from a `Matcher`.
     * @returns The server address if the URL is a match; otherwise, `undefined`.
     */
    private matchUrl(
        url: string,
        selectUrlMatcher: (matcher: Matcher) => UrlMatcher
    ): StaticServer | undefined {
        for (let matcher of this.matchers) {
            let server: StaticServer | undefined;

            server = selectUrlMatcher(matcher)(url);

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
function createMatcher(server: DynamicServer | StaticServer): Matcher {
    if ('remotePattern' in server) {
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
    let remotePattern: RegExp;
    let webPattern: RegExp;
    let httpTemplate: ParsedTemplate;
    let sshTemplate: ParsedTemplate;
    let webTemplate: ParsedTemplate | undefined;

    // The patterns are regular expressions, so parse
    // them once instead of each time we execute.
    try {
        remotePattern = new RegExp(server.remotePattern);
    } catch (ex) {
        log("Invalid dynamic server remote pattern '%s': %s", server.remotePattern, ex);
        return { remote: () => undefined, web: () => undefined };
    }

    if (server.webPattern) {
        try {
            webPattern = new RegExp(server.webPattern);
        } catch (ex) {
            log("Invalid dynamic server web pattern '%s': %s", server.remotePattern, ex);
            return { remote: () => undefined, web: () => undefined };
        }
    } else {
        webPattern = remotePattern;
    }

    // Parse the templates now so we don't
    // have to do it each time we execute.
    httpTemplate = parseTemplate(server.http);
    sshTemplate = parseTemplate(server.ssh);
    webTemplate = server.web ? parseTemplate(server.web) : undefined;

    return {
        remote: create(remotePattern),
        web: create(webPattern)
    };

    /**
     * Creates a matcher function.
     *
     * @param pattern The pattern to test with.
     * @returns The matcher function.
     */
    function create(pattern: RegExp): Matcher['remote'] {
        return (url) => {
            let match: RegExpMatchArray | null;

            match = pattern.exec(url);

            if (match) {
                let http: string;
                let server: Mutable<StaticServer>;

                http = httpTemplate.render({ match });

                // The URL matched the pattern. Render the templates to get the
                // URLs, making the match available for the templates to use.
                server = {
                    http,
                    ssh: sshTemplate.render({ match })
                };

                if (webTemplate) {
                    server.web = webTemplate?.render({ match });
                }

                return server;
            }

            return undefined;
        };
    }
}

/**
 * Creates a matcher function for the given static server definition.
 *
 * @param server The server definition.
 * @returns The matcher function.
 */
function createStaticServerMatcher(server: StaticServer): Matcher {
    return {
        remote: (url) => (isRemoteMatch(url, server) ? server : undefined),
        web: (url) => (isWebMatch(url, server) ? server : undefined)
    };
}

/**
 * Determines whether the given remote URL matches the given server definition.
 *
 * @param remoteUrl The remote URL.
 * @param server The server definition.
 * @returns True if the URL matches the server; otherwise, false.
 */
function isRemoteMatch(remoteUrl: string, server: StaticServer): boolean {
    remoteUrl = normalizeUrl(remoteUrl);

    if (remoteUrl.startsWith(normalizeUrl(server.http))) {
        return true;
    }

    if (server.ssh && remoteUrl.startsWith(normalizeUrl(server.ssh))) {
        return true;
    }

    return false;
}

/**
 * Determines whether the given web interface URL matches the given server definition.
 *
 * @param webUrl The web interface URL.
 * @param server The server definition.
 * @returns True if the URL matches the server; otherwise, false.
 */
function isWebMatch(webUrl: string, server: StaticServer): boolean {
    return normalizeUrl(webUrl).startsWith(normalizeUrl(server.web ?? server.http));
}

/**
 * Creates a matcher function that fetches the static server definitions when invoked.
 *
 * @param factory The function to get the server definitions.
 * @returns The matcher function.
 */
function createLazyStaticServerMatcher(factory: StaticServerFactory): Matcher {
    return {
        remote: create(isRemoteMatch),
        web: create(isWebMatch)
    };

    /**
     * Creates a matcher function.
     *
     * @param test The function to test a match.
     * @returns The matcher function.
     */
    function create(test: typeof isRemoteMatch | typeof isWebMatch): Matcher['remote'] {
        return (url) => {
            for (let server of factory()) {
                if (test(url, server)) {
                    return server;
                }
            }

            return undefined;
        };
    }
}

type StaticServerFactory = () => StaticServer[];

type UrlMatcher = (url: string) => StaticServer | undefined;

interface Matcher {
    readonly remote: UrlMatcher;

    readonly web: UrlMatcher;
}
