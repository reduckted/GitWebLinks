/* eslint-disable no-console, no-process-exit */

import * as path from 'path';
import { runTests } from 'vscode-test';

/**
 * Runs the tests.
 */
async function main(): Promise<void> {
    try {
        await runTests({
            extensionDevelopmentPath: path.resolve(__dirname, '../'),
            extensionTestsPath: path.resolve(__dirname, './index'),
            launchArgs: ['--disable-extensions']
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

void main();
