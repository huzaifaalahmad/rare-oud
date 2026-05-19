import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT || 5173);
const webServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'
  ? undefined
  : {
      command: 'node tests/serve-dist.mjs',
      url: `http://127.0.0.1:${port}`,
      reuseExistingServer: true,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 500 }
    };

export default defineConfig({
  testDir: './tests',
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer
});
