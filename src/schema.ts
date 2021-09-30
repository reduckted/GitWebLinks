import * as fs from 'fs';
import * as path from 'path';

/**
 * Defines a handler
 */
export type HandlerDefinition = PublicHandlerDefinition | PrivateHandlerDefinition;

/**
 * Defines a handler for a public remote host.
 */
export interface PublicHandlerDefinition extends HandlerDefinitionBase {
    /**
     * The public server URLs.
     */
    readonly server: Server;
}

/**
 * Defines a handler for a private remote host.
 */
export interface PrivateHandlerDefinition extends HandlerDefinitionBase {
    /**
     * The name of the settings property that defines the private server URLs.
     */
    readonly private: string;
}

/**
 * Defines a handler.
 */
export interface HandlerDefinitionBase {
    /**
     * The name of the remote server type.
     */
    readonly name: string;

    /**
     * The type of ref used for branch names.
     */
    readonly branchRef: 'abbreviated' | 'symbolic';

    /**
     * The template to build the URL of a file.
     */
    readonly url: Template;

    /**
     * Query string modifications that are based on the file name.
     */
    readonly query?: QueryModification[];

    /**
     * The template to build the part of the URL that specifies the selection.
     */
    readonly selection: Template;

    /**
     * The settings to convert a URL into a file name.
     */
    readonly reverse: ReverseSettings;
}

/**
 * A modification to make to the URL's query string for matching files.
 */
export interface QueryModification {
    /**
     * The regular expression to match against the file name.
     */
    readonly pattern: string;

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
 * The settings to convert a URL into a file name.
 */
export interface ReverseSettings {
    /**
     * The regular expression pattern to match against the URL.
     */
    readonly pattern: string | string[];

    /**
     * The template to produce a file name.
     */
    readonly file: Template;

    /**
     * Indicates that the extracted file name may start with the name of a
     * branch because the branch appears as a file path in the URL and the
     * end of the branch and start of the file name cannot be determined.
     */
    readonly fileMayStartWithBranch?: boolean;

    /**
     * The templates that provide the base remote URLs.
     */
    readonly server: ReverseServerSettings;

    /**
     * The templates that provide the selection range.
     */
    readonly selection: ReverseSelectionSettings;
}

/**
 * The server settings to convert a URL into a file name.
 */
export interface ReverseServerSettings {
    /**
     * The template to produce the HTTP server URL.
     */
    readonly http: Template;

    /**
     * The template to produce the SSH server URL.
     */
    readonly ssh: Template;
}

/**
 * The selection settings to convert a URL into a file name.
 */
export interface ReverseSelectionSettings {
    /**
     * The template to produce the one-based line number that the selection starts at.
     */
    readonly startLine: Template;

    /**
     * The template to produce the one-based line number that the selection ends at.
     */
    readonly endLine?: Template;

    /**
     * The template to produce the one-based column number that the selection starts at.
     */
    readonly startColumn?: Template;

    /**
     * The template to produce the one-based column number that the selection ends at.
     */
    readonly endColumn?: Template;
}

/**
 * A raw Liquid template. When a template is an array, all elements will be concatenated together before parsing.
 */
export type Template = string | string[];

/**
 * Defines the server that the handler matches to.
 */
export type Server = StaticServer | DynamicServer[];

/**
 * Defines a server with a fixed address.
 */
export interface StaticServer {
    /**
     * The HTTP(S) URL of the remote server.
     */
    readonly http: string;

    /**
     * The SSH URL of the remote server.
     */
    readonly ssh: string | undefined;
}

/**
 * Defines a server with an address that requires parsing.
 */
export interface DynamicServer {
    /**
     * A regular expression to match on a remote URL.
     */
    readonly pattern: string;

    /**
     * The template to build the HTTP(S) URL of the remote server.
     */
    readonly http: Template;

    /**
     * The template to build the SSH URL of the remote server.
     */
    readonly ssh: Template;
}

/**
 * Loads the handler definitions.
 *
 * @returns The handler definitions.
 */
export function load<T extends HandlerDefinition>(): T[] {
    // If we have been compiled to a webpack bundle, then the definitions
    // have been included in the bundle and we can require them.
    // If not, then we will need to load them from disk.
    if (process.env.WEBPACK) {
        let context: __WebpackModuleApi.RequireContext;

        context = require.context('../shared/handlers');

        return context.keys().map((key) => context(key) as T);
    } else {
        let dir: string;

        dir = path.resolve(__dirname, '../shared/handlers');

        /* eslint-disable node/no-sync */
        return fs
            .readdirSync(dir)
            .filter((entry) => path.extname(entry) === '.json')
            .map((file) => fs.readFileSync(path.join(dir, file), { encoding: 'utf-8' }))
            .map((contents) => JSON.parse(contents) as T);
        /* eslint-enable node/no-sync */
    }
}
