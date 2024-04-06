# AB Testify

ABTestify is a versatile and user-friendly npm package for implementing A/B testing seamlessly into your JavaScript projects. Whether you're a developer looking to optimize user experiences or a product manager seeking data-driven insights, ABTestify empowers you to effortlessly create, manage, and analyze A/B tests.

## Test Coverage

[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](https://raw.githubusercontent.com/pranav2012/abtestify/master/coverage/lcov-report/index.html)

## Installation

You can install the package via npm:

```bash
npm install abtestify
```

Or via yarn:

```bash
yarn add abtestify
```

## Usage

### React/Next.js Projects

```javascript
// Import the function
import { getABExperimentBucket } from "abtestify";

// Use it in your component
const variant = getABExperimentBucket({
	experimentName: "exampleExperiment",
	uniqueId: "user123",
	treatmentSplit: 50,
	exposure: 100,
});

console.log("Variant:", variant);
```

### Normal JavaScript Projects

```javascript
// Import the function
const { getABExperimentBucket } = require("abtestify");

// Use it in your code
const variant = getABExperimentBucket({
	experimentName: "exampleExperiment",
	uniqueId: "user123",
	treatmentSplit: 50,
	exposure: 100,
});

console.log("Variant:", variant);
```
