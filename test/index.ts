// tslint:disable-next-line:no-var-requires
let testRunner = require('vscode/lib/testrunner');

testRunner.configure({
    ui: 'bdd',
    useColors: true
});

module.exports = testRunner;
