// @ts-check

import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const context = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'silent',
    define: {
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development')
    },
    plugins: [
        {
            name: 'esbuild-problem-matcher',

            setup(build) {
                build.onStart(() => {
                    if (watch) {
                        console.log('[watch] build started');
                    }
                });
                build.onEnd((result) => {
                    result.errors.forEach(({ text, location }) => {
                        console.error(`✘ [ERROR] ${text}`);
                        console.error(
                            `    ${location?.file}:${location?.line}:${location?.column}:`
                        );
                    });

                    if (watch) {
                        console.log('[watch] build finished');
                    }
                });
            }
        }
    ]
});

if (watch) {
    await context.watch();
} else {
    await context.rebuild();
    await context.dispose();
}
