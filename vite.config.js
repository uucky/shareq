import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

import { defineConfig } from 'vite';

function readPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  return packageJson.version;
}

function normalizeCommit(value) {
  const commit = value?.trim();
  if (!commit) {
    return '';
  }

  return commit.slice(0, 7);
}

function readGitCommit() {
  const appCommit = normalizeCommit(process.env.APP_COMMIT);
  if (appCommit) {
    return appCommit;
  }

  try {
    return normalizeCommit(
      execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], {
        encoding: 'utf8'
      })
    );
  } catch (error) {
    const stdout = normalizeCommit(error.stdout?.toString());
    if (stdout) {
      return stdout;
    }

    return 'unknown';
  }
}

function readFullGitCommit() {
  const appCommit = process.env.APP_COMMIT?.trim();
  if (appCommit) {
    return appCommit;
  }

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    const stdout = error.stdout?.toString().trim();
    if (stdout) {
      return stdout;
    }

    return 'unknown';
  }
}

export default defineConfig({
  root: 'client',
  define: {
    __APP_VERSION__: JSON.stringify(readPackageVersion()),
    __APP_COMMIT__: JSON.stringify(readGitCommit()),
    __APP_COMMIT_FULL__: JSON.stringify(readFullGitCommit())
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
