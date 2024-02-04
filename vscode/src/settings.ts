import { workspace, WorkspaceConfiguration } from 'vscode';

import { CONFIGURATION } from './constants';
import { StaticServer } from './schema';
import { LinkFormat, LinkType } from './types';

/**
 * Provides access to the extension's settings.
 */
export class Settings {
    /**
     * Gets the server URLs for the specified type of server.
     *
     * @param type The type of server.
     * @returns The server URLs.
     */
    public getServers(type: string): StaticServer[] {
        let servers: ServerSetting[] | undefined;

        servers = this.getConfiguration().get<ServerSetting[]>(type);

        if (servers && Array.isArray(servers)) {
            return servers.map(toStaticServer).filter((x) => !!x.http);
        }

        return [];
    }

    /**
     * Gets the link type to use when producing a link when a link type was not specified.
     *
     * @returns The link type to use by default.
     */
    public getDefaultLinkType(): LinkType {
        // Ensure that the type is a valid value.
        switch (this.getConfiguration().get<string>(CONFIGURATION.linkType)) {
            case 'branch':
                return 'branch';

            case 'defaultBranch':
                return 'defaultBranch';

            default:
                return 'commit';
        }
    }

    /**
     * Gets the format to use when copying a link.
     *
     * @returns The link format to use.
     */
    public getLinkFormat(): LinkFormat {
        // Ensure that the type is a valid value.
        switch (this.getConfiguration().get<string>(CONFIGURATION.linkFormat)) {
            case 'markdown':
                return 'markdown';

            case 'markdownWithPreview':
                return 'markdownWithPreview';

            default:
                return 'raw';
        }
    }

    /**
     * Gets the name of the branch to use when producing a link for the default branch.
     *
     * @returns The name of the default branch, or `undefined` if the default branch should be discovered automatically.
     */
    public getDefaultBranch(): string | undefined {
        return this.getConfiguration().get<string>(CONFIGURATION.defaultBranch);
    }

    /**
     * Gets the name of the remote to use.
     *
     * @returns The name of the remote.
     */
    public getPreferredRemoteName(): string {
        return this.getConfiguration().get<string>(CONFIGURATION.preferredRemoteName) ?? 'origin';
    }

    /**
     * Gets the setting that controls whether the "Copy Link" menu item is visible.
     *
     * @returns True if the menu item should be visible; otherwise, false.
     */
    public getShowCopy(): boolean {
        return !!this.getConfiguration().get(CONFIGURATION.showCopy);
    }

    /**
     * Gets the setting that controls whether the "Open Link" menu item is visible.
     *
     * @returns True if the menu item should be visible; otherwise, false.
     */
    public getShowOpen(): boolean {
        return !!this.getConfiguration().get(CONFIGURATION.showOpen);
    }

    /**
     * Gets the setting that controls whether short SHA hashes should be used.
     *
     * @returns True if short hashes should be used; otherwise, false.
     */
    public getUseShortHash(): boolean {
        return !!this.getConfiguration().get(CONFIGURATION.useShortHash);
    }

    /**
     * Gets a handler-specific setting.
     *
     * @param key The key of the setting to retrieve.
     * @returns The value of the setting.
     */
    public getHandlerSetting(key: string): unknown {
        return this.getConfiguration().get(key);
    }

    /**
     * Gets the configuration for the workspace.
     *
     * @returns The configuration.
     */
    private getConfiguration(): WorkspaceConfiguration {
        return workspace.getConfiguration(CONFIGURATION.section);
    }
}

/**
 * Converts a server that was defined in the settings to a `StaticServer` object.
 *
 * @param server The server defined in the settings.
 * @returns The `StaticServer` object.
 */
function toStaticServer(server: ServerSetting): StaticServer {
    // The property names for servers were changed between v1 and v2
    // of the extension. Automatically convert the V1 settings to V2.
    if ('baseUrl' in server) {
        return { http: server.baseUrl, ssh: server.sshUrl };
    } else {
        return server;
    }
}

/**
 * The server definition used by v1 of the extension.
 */
interface LegacyServer {
    /**
     * The HTTP url. Equivalent to `StaticServer.http`.
     */
    baseUrl: string;

    /**
     * The SSH url. Equivalent to `StaticServer.ssh`.
     */
    sshUrl: string;
}

type ServerSetting = LegacyServer | StaticServer;
