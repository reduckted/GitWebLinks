import { workspace } from 'vscode';

import { CONFIGURATION_KEY } from '../constants';


export type LinkType = 'hash' | 'branch';


export class LinkTypeProvider {

    public getLinkType(): LinkType {
        let type: string | undefined;


        type = workspace.getConfiguration().get<string>(`${CONFIGURATION_KEY}.linkType`);

        if (type === 'branch') {
            return 'branch';
        }

        return 'hash';
    }

}
