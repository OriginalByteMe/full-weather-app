import { defineConfig } from "cypress";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
	e2e: {
		baseUrl: process.env.CYPRESS_BASE_URL || "http://localhost:3001",
		setupNodeEvents(on, config) {
			on("before:browser:launch", (browser, launchOptions) => {
				if (browser.name === "chrome" || browser.name === "edge") {
					launchOptions.args.push("--disable-gpu");
					launchOptions.args.push("--no-sandbox");
					return launchOptions;
				}
			});
		},
		defaultCommandTimeout: 10000,
		retries: {
			runMode: 2,
			openMode: 1,
		},
		video: false,
		screenshotOnRunFailure: true,
	},
});
