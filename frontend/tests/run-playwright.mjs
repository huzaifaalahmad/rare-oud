import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = Number(process.env.PORT || (5700 + Math.floor(Math.random() * 1000)));
const args = process.argv.slice(2);
const childEnv = { ...process.env, PORT: String(port), PLAYWRIGHT_SKIP_WEB_SERVER: '1' };

function spawnNode(script, scriptArgs = [], options = {}) {
  return spawn(process.execPath, [script, ...scriptArgs], {
    cwd: process.cwd(),
    env: options.env || process.env,
    stdio: options.stdio || 'inherit'
  });
}

async function waitForServer() {
  const url = `http://127.0.0.1:${port}/`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Retry until the static server is listening.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Static test server did not become ready at ${url}`);
}

const server = spawnNode('tests/serve-dist.mjs', [], { env: childEnv });

function stopServer() {
  if (!server.killed) server.kill('SIGTERM');
}

process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(143);
});

try {
  await waitForServer();
  const cli = spawnNode('node_modules/@playwright/test/cli.js', ['test', ...args], {
    stdio: 'inherit',
    env: childEnv
  });
  const [code] = await once(cli, 'exit');
  stopServer();
  process.exit(code || 0);
} catch (error) {
  console.error(error);
  stopServer();
  process.exit(1);
}
