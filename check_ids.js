import fs from 'fs';
import path from 'path';

const appJsPath = path.resolve('public/app.js');
const indexHtmlPath = path.resolve('public/index.html');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const regex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = regex.exec(appJs)) !== null) {
  ids.add(match[1]);
}

console.log('Checking IDs in public/index.html...');
let missing = 0;
for (const id of ids) {
  const exists = indexHtml.includes(`id="${id}"`) || indexHtml.includes(`id='${id}'`);
  if (!exists) {
    console.log(`Missing ID in HTML: ${id}`);
    missing++;
  }
}
console.log(`Total unique IDs checked: ${ids.size}, Missing: ${missing}`);
