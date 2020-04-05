import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';

export function run(): Promise<void> {
    let mocha: Mocha;
    let root: string;

    mocha = new Mocha({
        ui: 'bdd',
        useColors: true
    });

    root = __dirname;

    return new Promise((resolve, reject) => {
        glob('**/**.test.js', { cwd: root }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files.forEach((f) => mocha.addFile(path.resolve(root, f)));

            try {
                mocha.run((failures) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                console.error(err); // tslint:disable-line: no-console
                reject(err);
            }
        });
    });
}
