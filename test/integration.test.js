import { spawn } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert';

test('Server integration test', async (t) => {
  await t.test('Server starts and responds to HTTP requests', async () => {
    console.log('Spawning test server on port 3001...');
    const serverProcess = spawn('node', ['server.js'], {
      shell: true,
      env: { ...process.env, PORT: '3001' }
    });

    // Promise that resolves when the server logs that it is running
    const serverReady = new Promise((resolve, reject) => {
      let output = '';
      
      const onData = (data) => {
        const str = data.toString();
        output += str;
        console.log(`[Server stdout] ${str.trim()}`);
        if (output.includes('ShareQ server running')) {
          resolve();
        }
      };

      const onError = (data) => {
        console.error(`[Server stderr] ${data.toString().trim()}`);
      };

      serverProcess.stdout.on('data', onData);
      serverProcess.stderr.on('data', onError);

      serverProcess.on('error', (err) => {
        reject(new Error(`Failed to start server process: ${err.message}`));
      });

      serverProcess.on('exit', (code) => {
        if (code !== null && code !== 0) {
          reject(new Error(`Server exited early with code ${code}`));
        }
      });
    });

    // Wait for server to print the running message (with a 5 second timeout)
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout waiting for server to start')), 5000)
    );

    try {
      await Promise.race([serverReady, timeout]);
      console.log('Server is ready. Sending GET request to http://localhost:3001/...');
      
      const response = await fetch('http://localhost:3001/');
      assert.strictEqual(response.status, 200);
      
      const html = await response.text();
      console.log('Response received. Checking HTML content...');
      
      assert.match(html, /ShareQ/i);
      assert.match(html, /测试服/);
      console.log('Assertions passed successfully!');
    } finally {
      console.log('Stopping test server...');
      if (process.platform === 'win32') {
        spawn('taskkill', ['/F', '/T', '/PID', serverProcess.pid], { shell: true });
      } else {
        serverProcess.kill('SIGTERM');
      }
      await new Promise((resolve) => {
        serverProcess.on('exit', () => {
          console.log('Test server exited.');
          resolve();
        });
      });
    }
  });
});
