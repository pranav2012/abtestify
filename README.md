# AB Testify

ABTestify is a versatile and user-friendly npm package for implementing A/B testing seamlessly into your JavaScript projects. Whether you're a developer looking to optimize user experiences or a product manager seeking data-driven insights, ABTestify empowers you to effortlessly create, manage, and analyze A/B tests.

## Test Coverage

[![Coverage][npm-coverage-image]](npm-coverage-url)
[![NPM Version][npm-version-image]][npm-url]
[![NPM Install Size][npm-install-size-image]][npm-install-size-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]
[![MIT Licence][npm-mit-image]][npm-mit-url]

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
[npm-coverage-image]: https://img.shields.io/badge/coverage-100%25-brightgreen.svg
[npm-install-size-image]: https://badgen.net/packagephobia/install/abtestify
[npm-install-size-url]: https://packagephobia.com/result?p=abtestify
[npm-downloads-image]: https://badgen.net/npm/dm/abtestify
[npm-downloads-url]: https://npmcharts.com/compare/abtestify?minimal=true
[npm-version-image]: https://badgen.net/npm/v/abtestify
[npm-coverage-url]: https://raw.githubusercontent.com/pranav2012/abtestify/master/coverage/lcov-report/index.html
[npm-url]: https://npmjs.org/package/abtestify
[npm-mit-image]: https://badges.frapsoft.com/os/mit/mit.svg?v=103
[npm-mit-url]: https://opensource.org/licenses/mit-license.php