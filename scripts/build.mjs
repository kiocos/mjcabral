import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
await build({
  entryPoints: ['reader.js'],
  outfile: 'assets/reader.js',
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2022'],
  legalComments: 'inline',
  banner: { js: '/* Pretext + Portuguese hyphenation. Licenses: assets/licenses/. */' },
});
await mkdir('assets/licenses', { recursive: true });
await copyFile('node_modules/@chenglou/pretext/LICENSE', 'assets/licenses/pretext-MIT.txt');
await copyFile('node_modules/hyphen/LICENSE', 'assets/licenses/hyphen-ISC.txt');
execFileSync('python3', ['build.py'], { stdio: 'inherit' });
