import { ExtensionContext } from 'vscode';

import { ExtensionHost } from './ExtensionHost';
import { Logger } from './utilities/Logger';

let extension: ExtensionHost;

export async function activate(context: ExtensionContext): Promise<void> {
    if (!process.env.EXTENSION_TESTING) {
        extension = new ExtensionHost();
        await extension.activate(context);
    } else {
        Logger.writeLine(
            'Not activating extension because tests are being run.'
        );
    }
}

export function deactivate(): void {
    // Nothing to do here.
}
