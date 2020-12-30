import * as path from 'path';
import { runTests } from 'vscode-test';

async function main() {
    try {
        await runTests({
            extensionDevelopmentPath: path.resolve(__dirname, '../'),
            extensionTestsPath: path.resolve(__dirname, './index'),
            launchArgs: ['--disable-extensions']
        });
    } catch (err) {
        console.error('Failed to run tests'); // tslint:disable-line: no-console
        process.exit(1);
    }
}

main();
