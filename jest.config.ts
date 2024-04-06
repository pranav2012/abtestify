module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	extensionsToTreatAsEsm: [".ts"],
	collectCoverage: true,
	coverageReporters: ["text", "cobertura"],
};
