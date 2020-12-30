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
    server: Server;
}

/**
 * Defines a handler for a private remote host.
 */
export interface PrivateHandlerDefinition extends HandlerDefinitionBase {
    /**
     * The name of the settings property that defines the private server URLs.
     */
    private: string;
}

/**
 * Defines a handler.
 */
export interface HandlerDefinitionBase {
    /**
     * The name of the remote server type.
     */
    name: string;

    /**
     * The arguments to pass to Git to get the name of the current branch.
     */
    branch: string[];

    /**
     * The template to build the URL of a file.
     */
    url: Template;

    /**
     * The template to build the part of the URL that specifies the selection.
     */
    selection: Template;
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
    http: string;

    /**
     * The SSH URL of the remote server.
     */
    ssh: string | undefined;
}

/**
 * Defines a server with an address that requires parsing.
 */
export interface DynamicServer {
    /**
     * A regular expression to match on a remote URL.
     */
    pattern: string;

    /**
     * The template to build the HTTP(S) URL of the remote server.
     */
    http: Template;

    /**
     * The template to build the SSH URL of the remote server.
     */
    ssh: Template;
}

/**
 * Loads the handler definitions.
 */
export function load<T extends HandlerDefinition>(): T[] {
    // If we have been compiled to a webpack bundle, then the definitions
    // have been included in the bundle and we can require them.
    // If not, then we will need to load them from disk.
    if (process.env.WEBPACK) {
        let context: __WebpackModuleApi.RequireContext;

        context = require.context('../shared/handlers');

        return context.keys().map((key) => context(key));
    } else {
        let dir: string;

        dir = path.resolve(__dirname, '../shared/handlers');

        return fs
            .readdirSync(dir)
            .filter((entry) => path.extname(entry) === '.json')
            .map((file) => fs.readFileSync(path.join(dir, file), { encoding: 'utf-8' }))
            .map((contents) => JSON.parse(contents));
    }
}
