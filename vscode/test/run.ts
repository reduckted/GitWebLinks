/* eslint-disable no-console, no-process-exit */

import * as path from 'path';
import { runTests } from 'vscode-test';

runTests({
    extensionDevelopmentPath: path.resolve(__dirname, '../'),
    extensionTestsPath: path.resolve(__dirname, './index'),
    launchArgs: ['--disable-extensions']
}).catch(() => {
    console.error('Failed to run tests');
    process.exit(1);
});
