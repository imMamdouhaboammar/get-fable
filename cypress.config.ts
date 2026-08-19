import { defineConfig } from 'cypress';

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://127.0.0.1:3000',
    supportFile: false,
  },
  screenshotOnRunFailure: true,
  video: false,
});
