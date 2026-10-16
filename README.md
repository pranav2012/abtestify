# AB Testify

Deterministic A/B test bucketing for JavaScript. Give it an experiment name and a user ID and it returns the same variant for that user every time, with no storage and no network calls. It runs anywhere JavaScript does: Node, browsers, React and Next.js (server and client), Remix, and edge runtimes.

## Test Coverage

[![Coverage][npm-coverage-image]][npm-coverage-url]
[![NPM Version][npm-version-image]][npm-url]
[![NPM Install Size][npm-install-size-image]][npm-install-size-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]
[![MIT Licence][npm-mit-image]][npm-mit-url]

## Installation

```bash
npm install abtestify
```

Or with yarn or pnpm:

```bash
yarn add abtestify
pnpm add abtestify
```

## Usage

```javascript
import { getABExperimentBucket } from 'abtestify';
// or: const { getABExperimentBucket } = require('abtestify');

const { resolvedVariant } = getABExperimentBucket({
	experimentName: 'checkout-cta',
	uniqueId: 'user123',
	treatmentSplit: 50,
	exposure: 100,
});

if (resolvedVariant === 'treatment') {
	// show the new checkout button
}
```

The package ships ES modules and CommonJS, with TypeScript types for both.

### Parameters

- `experimentName` (required): the name of the experiment. It is part of the hash, so each experiment splits users independently.
- `uniqueId` (required): a stable identifier for the user, such as a user ID or a device ID.
- `treatmentSplit` (optional, default `50`): the percentage of users in the experiment who get the treatment.
- `exposure` (optional, default `100`): the percentage of all users who are in the experiment. Everyone else gets the ignore variant.
- `controlVariantName` (optional, default `'control'`): the name of the control variant.
- `treatmentVariantName` (optional, default `'treatment'`): the name of the treatment variant.
- `ignoreVariantName` (optional, default `'ignore'`): the name returned for users outside the experiment.
- `legacyHashing` (optional, default `false`): bucket by `uniqueId` alone, as 0.1.x did. See [Upgrading from 0.1.x](#upgrading-from-01x).

Invalid input throws an `Error`: an empty or non-string `uniqueId` or `experimentName`, or a `treatmentSplit` or `exposure` that isn't a number from 0 to 100.

### Output

- `experimentName`: the experiment name you passed.
- `uniqueId`: the user ID you passed.
- `resolvedVariant`: the variant the user is in: the treatment, control or ignore name.

### How bucketing works

The user's bucket is the first 8 bytes of SHA-256 of `experimentName:uniqueId`, mapped to one of 10,000 buckets. Exposure takes the lowest buckets, and the split uses the bucket's last two digits, which means:

- The same user gets the same variant in an experiment on every call, on every platform.
- Different experiments split users independently.
- Raising `exposure` (say from 10 to 50) only adds users. Nobody already in the experiment changes variant.
- Raising `treatmentSplit` only moves users from control to treatment.

## Upgrading from 0.1.x

0.1.x hashed only `uniqueId` and ignored `experimentName`. A user therefore got the same variant in every experiment: someone in treatment for one experiment was in treatment for all of them, so experiments running at the same time skewed each other's results.

0.2.0 includes `experimentName` in the hash. **This reassigns users.** To keep the assignments of experiments that are already running, pass `legacyHashing: true` to them until they finish; it reproduces 0.1.x exactly. Start new experiments without it.

```javascript
getABExperimentBucket({
	experimentName: 'running-since-0.1',
	uniqueId: 'user123',
	legacyHashing: true,
});
```

Other changes in 0.2.0:

- Works in browsers and edge runtimes. 0.1.x imported Node's `crypto` and `Buffer`.
- Invalid input throws instead of returning `resolvedVariant: null` with `isError`.
- Ships CommonJS as well as ES modules.

[npm-coverage-image]: https://codecov.io/gh/pranav2012/abtestify/graph/badge.svg?token=CHCUS36FCG
[npm-coverage-url]: https://codecov.io/gh/pranav2012/abtestify
[npm-install-size-image]: https://img.shields.io/npm/unpacked-size/abtestify?label=install%20size
[npm-install-size-url]: https://www.npmjs.com/package/abtestify?activeTab=code
[npm-downloads-image]: https://badgen.net/npm/dm/abtestify
[npm-downloads-url]: https://npmcharts.com/compare/abtestify?minimal=true
[npm-version-image]: https://badgen.net/npm/v/abtestify
[npm-url]: https://npmjs.org/package/abtestify
[npm-mit-image]: https://badges.frapsoft.com/os/mit/mit.svg?v=103
[npm-mit-url]: https://opensource.org/licenses/mit-license.php
