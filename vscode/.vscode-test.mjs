// @ts-check

import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
    files: 'out-test/test/**/*.test.js',
    mocha: {
        ui: 'bdd',
        color: true,
        timeout: 5000
    }
});
