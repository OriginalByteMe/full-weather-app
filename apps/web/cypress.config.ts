import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3001',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('before:browser:launch', (browser, launchOptions) => {
        // Add more verbose logging for debugging
        if (browser.name === 'chrome' || browser.name === 'edge') {
          launchOptions.args.push('--disable-gpu');
          launchOptions.args.push('--no-sandbox');
          return launchOptions;
        }
      });
    },
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 2,
      openMode: 1
    },
    video: false,
    screenshotOnRunFailure: true,
  },
});
