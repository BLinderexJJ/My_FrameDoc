import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  // 'vscode' is provided by the host at runtime and must never be bundled.
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': production ? '"production"' : '"development"',
  },
};

/** @type {import('esbuild').BuildOptions} */
const extensionOptions = {
  ...shared,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
};

// La CLI no importa `vscode`, así que se puede ejecutar fuera del editor para
// verificar la generación en integración continua.
const targets = [extensionOptions];
if (!watch) {
  targets.push({
    ...shared,
    entryPoints: ['scripts/generate-cli.ts'],
    outfile: 'dist/generate-cli.js',
  });
}

if (watch) {
  const ctx = await esbuild.context(extensionOptions);
  await ctx.watch();
} else {
  await Promise.all(targets.map((options) => esbuild.build(options)));
}
