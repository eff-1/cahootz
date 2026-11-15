import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'dist');

function cleanAndEnsureDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
}

function compileTree(relSourceDir) {
  const absSourceDir = path.join(rootDir, relSourceDir);
  if (!fs.existsSync(absSourceDir)) return 0;

  let count = 0;
  const entries = fs.readdirSync(absSourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const relEntryPath = path.join(relSourceDir, entry.name);
    const absEntryPath = path.join(rootDir, relEntryPath);
    if (entry.isDirectory()) {
      count += compileTree(relEntryPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const tsSource = fs.readFileSync(absEntryPath, 'utf8');
      const stripped = stripTypeScriptTypes(tsSource, { mode: 'transform' });
      // Remove empty side-effect imports emitted from `import { type X } from '...'`
      // and rewrite relative .ts import/export specifiers to .js for pure ES module execution
      const jsCode = stripped
        .replace(/^\s*import\s+['"][^'"]+['"];\s*$/gm, '')
        .replace(
          /((?:from|import)\s+['"]\.\.?\/[^'"]+?)\.ts(['"])/g,
          '$1.js$2'
        );
      const outFilePath = path.join(outDir, relEntryPath.replace(/\.ts$/, '.js'));
      fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
      fs.writeFileSync(outFilePath, jsCode, 'utf8');
      count += 1;
    }
  }
  return count;
}

cleanAndEnsureDir(outDir);
fs.writeFileSync(
  path.join(outDir, 'package.json'),
  JSON.stringify({ name: 'cahootz-dist', private: true, type: 'module' }, null, 2) + '\n',
  'utf8'
);

const compiledCount =
  compileTree('packages/shared/src') +
  compileTree('apps/api/src') +
  compileTree('apps/worker/src');

console.log(`Built ${compiledCount} TypeScript modules into pure ES modules in ./dist (no --experimental-strip-types required at runtime).`);
