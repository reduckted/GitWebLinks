import { workspace } from 'vscode';

import { CONFIGURATION_KEY } from '../constants';
import { ServerUrl } from '../utilities/ServerUrl';

export class CustomServerProvider {
    public getServers(type: string): ServerUrl[] {
        let servers: ServerUrl[] | undefined;

        servers = workspace
            .getConfiguration()
            .get<ServerUrl[]>(`${CONFIGURATION_KEY}.${type}`);

        if (servers && Array.isArray(servers)) {
            return servers.filter((x) => !!x.baseUrl);
        }

        return [];
    }
}
