import * as esbuild from 'esbuild'

const settings = {
    entryPoints: ['app/view/main.ts', 'app/index/main.ts'],
    bundle: true,
    outdir: 'wwwroot/js',
    outbase: 'app'
};

if (process.argv.includes("--watch")) {
    (await esbuild.context(settings)).watch();
} else {
    await esbuild.build(settings);
}
