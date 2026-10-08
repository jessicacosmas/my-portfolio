// Copies ONLY the files a browser needs into ./dist, so you can drag that
// folder onto a host instead of the project folder - which would upload
// node_modules/ (the build toolchain) and src/ (the stylesheet source).
//   npm run pack
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copied = [];
for (const rel of ['index.html', 'assets', 'images']) {
  const from = path.join(root, rel);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(out, rel), { recursive: true });
  copied.push(rel);
}

if (!copied.includes('index.html')) {
  console.error('index.html not found - run this from the project root.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else files.push(path.relative(out, p).replace(/\\/g, '/'));
  }
})(out);

const bytes = files.reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
console.log('dist/ is ready - drag this folder onto app.netlify.com/drop\n');
for (const f of files.sort()) console.log('  ' + f);
console.log('\n' + files.length + ' files, ' + (bytes / 1024).toFixed(1) + ' KB.');
if (!copied.includes('images')) {
  console.log('Note: no images/ folder yet - the dashed placeholder boxes will show.');
}
console.log('Excluded on purpose: node_modules/, src/, dist/, package*.json, README.md, Moodboard/');
