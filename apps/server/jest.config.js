/** @type {import('jest').Config} */
export default {
	preset: "ts-jest",
	testEnvironment: "node",
	transform: {
		"^.+\\.ts$": [
			"ts-jest",
			{
				useESM: true,
			},
		],
	},
	moduleNameMapper: {
		"^(\\.{1,2}/.*)\\.js$": "$1",
	},
	extensionsToTreatAsEsm: [".ts"],
	moduleFileExtensions: ["ts", "js", "json", "node"],
	testMatch: ["**/__tests__/**/*.test.ts"],
	collectCoverage: true,
	coverageDirectory: "coverage",
	collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/index.ts"],
};
