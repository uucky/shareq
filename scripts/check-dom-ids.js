import fs from 'node:fs';
import path from 'node:path';

const clientDir = path.resolve('client');
const indexHtmlPath = path.join(clientDir, 'index.html');

function listJsFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectMatches(text, regex) {
  const matches = new Set();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return matches;
}

const html = fs.readFileSync(indexHtmlPath, 'utf8');
const jsFiles = listJsFiles(clientDir);
const jsSources = jsFiles.map((file) => ({
  file,
  text: fs.readFileSync(file, 'utf8')
}));

const declaredIds = new Set([...collectMatches(html, /\bid\s*=\s*["']([^"']+)["']/g)]);

for (const { text } of jsSources) {
  for (const id of collectMatches(text, /\bid\s*=\s*["']([^"']+)["']/g)) {
    declaredIds.add(id);
  }
  for (const id of collectMatches(text, /\.id\s*=\s*["']([^"']+)["']/g)) {
    declaredIds.add(id);
  }
}

const missing = [];
for (const { file, text } of jsSources) {
  const ids = collectMatches(text, /document\.getElementById\(\s*["']([^"'`$]+)["']\s*\)/g);
  for (const id of ids) {
    if (!declaredIds.has(id)) {
      missing.push({ file: path.relative(process.cwd(), file), id });
    }
  }
}

if (missing.length > 0) {
  console.error('Missing DOM IDs referenced by frontend JavaScript:');
  for (const item of missing) {
    console.error(`- ${item.id} (${item.file})`);
  }
  process.exitCode = 1;
} else {
  console.log(`DOM ID check passed for ${jsFiles.length} frontend JavaScript files.`);
}
