import { spawn } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.dirname(scriptsDir);
const viteCli = path.join(appDir, 'node_modules', 'vite', 'bin', 'vite.js');
const children = [
  {
    name: 'server',
    command: process.execPath,
    args: ['server.js']
  },
  {
    name: 'vite',
    command: process.execPath,
    args: [viteCli, '--host', '0.0.0.0']
  }
];

const processes = [];
let isShuttingDown = false;

function pipeOutput(stream, name, output) {
  const lines = readline.createInterface({ input: stream });

  lines.on('line', (line) => {
    output.write(`[${name}] ${line}\n`);
  });

  return lines;
}

function stopChildren(signal = 'SIGTERM') {
  for (const child of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  stopChildren(signal);
}

for (const childConfig of children) {
  const child = spawn(childConfig.command, childConfig.args, {
    cwd: appDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  processes.push(child);
  pipeOutput(child.stdout, childConfig.name, process.stdout);
  pipeOutput(child.stderr, childConfig.name, process.stderr);

  child.on('error', (error) => {
    console.error(`[${childConfig.name}] failed to start: ${error.message}`);
    process.exitCode = 1;
    shutdown();
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    stopChildren();

    if (signal) {
      console.error(`[${childConfig.name}] exited with signal ${signal}`);
      process.exit(1);
    }

    process.exit(code ?? 1);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
