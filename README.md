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

### Function Parameters
The function takes an object with the following properties:

* `experimentName` (required): The name of the experiment.
* `uniqueId` (required): The unique identifier for the user. This can be an email, user ID, etc.
* `treatmentSplit` (optional, default: 50): The percentage of users to be bucketed into the treatment group.
* `exposure` (optional, default: 100): The percentage of users to be bucketed into the experiment.
* `controlVariantName` (optional, default: 'control'): The name of the control variant.
* `treatmentVariantName` (optional, default: 'treatment'): The name of the treatment variant.
* `ignoreVariantName` (optional, default: 'ignore'): The name of the variant to be ignored.

### Function Output
The function returns an object with the following properties:

* `experimentName`: The name of the experiment.
* `uniqueId`: The unique identifier for the user.
* `resolvedVariant`: The variant that the user is assigned to, or null if there was an error.
* `isError` (optional): Indicates if there was an error while assigning the variant.
* `error` (optional): The error object, if isError is true.

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

[npm-coverage-image]: https://codecov.io/gh/pranav2012/abtestify/graph/badge.svg?token=CHCUS36FCG
[npm-coverage-url]: https://codecov.io/gh/pranav2012/abtestify
[npm-install-size-image]:https://packagephobia.com/badge?p=abtestify
[npm-install-size-url]: https://packagephobia.com/result?p=abtestify
[npm-downloads-image]: https://badgen.net/npm/dm/abtestify
[npm-downloads-url]: https://npmcharts.com/compare/abtestify?minimal=true
[npm-version-image]: https://badgen.net/npm/v/abtestify
[npm-url]: https://npmjs.org/package/abtestify
[npm-mit-image]: https://badges.frapsoft.com/os/mit/mit.svg?v=103
[npm-mit-url]: https://opensource.org/licenses/mit-license.php