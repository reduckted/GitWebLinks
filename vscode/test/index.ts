import { glob } from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

/**
 * Runs the tests.
 *
 * @returns A promise.
 */
export async function run(): Promise<void> {
    let mocha: Mocha;
    let root: string;
    let files: string[];

    mocha = new Mocha({
        ui: 'bdd',
        color: true,
        timeout: 5000
    });

    root = __dirname;

    files = await glob('**/**.test.js', { cwd: root });
    files.forEach((f) => mocha.addFile(path.resolve(root, f)));

    return new Promise((resolve, reject) => {
        try {
            mocha.run((failures) => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
            reject(err);
        }
    });
}
