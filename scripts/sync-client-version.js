import fs from 'node:fs';

const packageJsonPath = 'package.json';
const indexHtmlPath = 'client/index.html';
const versionMarkerRegex = /<strong id="app-version">([^<]*)<\/strong>/g;

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

if (typeof version !== 'string' || version.length === 0) {
  console.error(`${packageJsonPath} must contain a non-empty string version.`);
  process.exit(1);
}

const expectedVersionText = `v${version}`;
const html = fs.readFileSync(indexHtmlPath, 'utf8');
const matches = [...html.matchAll(versionMarkerRegex)];

if (matches.length !== 1) {
  console.error(`Expected exactly one app version marker in ${indexHtmlPath}, found ${matches.length}.`);
  process.exit(1);
}

const currentVersionText = matches[0][1];
const updatedHtml = html.replace(versionMarkerRegex, `<strong id="app-version">${expectedVersionText}</strong>`);

if (updatedHtml === html) {
  if (currentVersionText !== expectedVersionText) {
    console.error(`Failed to update app version marker in ${indexHtmlPath}.`);
    process.exit(1);
  }

  console.log(`${indexHtmlPath} already has ${expectedVersionText}.`);
} else {
  fs.writeFileSync(indexHtmlPath, updatedHtml);
  console.log(`Updated ${indexHtmlPath} from ${currentVersionText} to ${expectedVersionText}.`);
}
