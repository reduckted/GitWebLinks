import { ExtensionContext } from 'vscode';

import { ExtensionHost } from './ExtensionHost';

let extension: ExtensionHost;

export async function activate(context: ExtensionContext): Promise<void> {
    if (!process.env.EXTENSION_TESTING) {
        extension = new ExtensionHost();
        await extension.activate(context);
    }
}

export function deactivate(): void {
    // Nothing to do here.
}
