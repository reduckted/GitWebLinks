/* eslint-disable no-console, no-process-exit */

import { runTests } from '@vscode/test-electron';
import * as path from 'path';

runTests({
    extensionDevelopmentPath: path.resolve(__dirname, '../'),
    extensionTestsPath: path.resolve(__dirname, './index'),
    launchArgs: ['--disable-extensions']
}).catch(() => {
    console.error('Failed to run tests');
    process.exit(1);
});
