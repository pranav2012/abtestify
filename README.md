# AB Testify

Deterministic A/B test bucketing for JavaScript, Go, Rust, Python, Java/Kotlin and Swift. Give it an experiment name and a user ID and it returns the same variant for that user every time, with no storage and no network calls. The JavaScript package runs anywhere JavaScript does: Node, browsers, React and Next.js (server and client), Remix, and edge runtimes.

Every language port assigns every user to exactly the same variant as the npm package, so a user bucketed on your Go backend, your Swift app and your Next.js frontend sees one consistent experience. See [The cross-language guarantee](#the-cross-language-guarantee).

## Test Coverage

[![Coverage][npm-coverage-image]][npm-coverage-url]
[![NPM Version][npm-version-image]][npm-url]
[![NPM Install Size][npm-install-size-image]][npm-install-size-url]
[![NPM Downloads][npm-downloads-image]][npm-downloads-url]
[![MIT Licence][npm-mit-image]][npm-mit-url]

## Installation and usage

| Language | Registry | Package |
| --- | --- | --- |
| JavaScript / TypeScript | npm | [`abtestify`](https://www.npmjs.com/package/abtestify) |
| Go | Go modules | `github.com/pranav2012/abtestify/go` |
| Rust | crates.io | [`abtestify`](https://crates.io/crates/abtestify) |
| Python | PyPI | [`abtestify`](https://pypi.org/project/abtestify/) |
| Java / Kotlin | Maven Central | `io.github.pranav2012:abtestify` |
| Swift | Swift Package Manager | `https://github.com/pranav2012/abtestify.git` |

All of them are released together with the same version number.

### JavaScript and TypeScript

```bash
npm install abtestify
```

Or with yarn or pnpm:

```bash
yarn add abtestify
pnpm add abtestify
```

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

### Go

```bash
go get github.com/pranav2012/abtestify/go
```

```go
import abtestify "github.com/pranav2012/abtestify/go"

result, err := abtestify.GetBucket(abtestify.Params{
	ExperimentName: "checkout-cta",
	UniqueID:       "user123",
	TreatmentSplit: abtestify.Float64(50), // nil means the default
	Exposure:       abtestify.Float64(100),
})
if err != nil {
	return err // *abtestify.ValidationError
}
if result.ResolvedVariant == "treatment" {
	// show the new checkout button
}
```

Optional fields are pointers so that an explicit `0` is distinct from "use the default"; `abtestify.Float64` and `abtestify.String` fill them inline.

### Rust

```toml
[dependencies]
abtestify = "0.2"
```

```rust
use abtestify::{get_bucket, Params};

let params = Params::new("checkout-cta", "user123")
    .treatment_split(50.0)
    .exposure(100.0);
let assignment = get_bucket(&params)?; // Result<Assignment, abtestify::Error>
if assignment.resolved_variant == "treatment" {
    // show the new checkout button
}
```

No dependencies. `Params::default()` and `Params::new` fill in every default.

### Python

```bash
pip install abtestify
```

```python
from abtestify import get_ab_experiment_bucket

assignment = get_ab_experiment_bucket(
    "checkout-cta",
    "user123",
    treatment_split=50,
    exposure=100,
)
if assignment.resolved_variant == "treatment":
    ...  # show the new checkout button
```

Python 3.9+, typed, no dependencies. Returns a frozen dataclass; invalid input raises `ValueError` or `TypeError`.

### Java and Kotlin

Gradle:

```kotlin
dependencies {
    implementation("io.github.pranav2012:abtestify:<version>")
}
```

Maven:

```xml
<dependency>
  <groupId>io.github.pranav2012</groupId>
  <artifactId>abtestify</artifactId>
  <version><!-- version --></version>
</dependency>
```

Java:

```java
import io.github.pranav2012.abtestify.ABTestify;
import io.github.pranav2012.abtestify.Assignment;
import io.github.pranav2012.abtestify.Params;

Assignment assignment = ABTestify.getBucket(
        Params.builder("checkout-cta", "user123").treatmentSplit(50).exposure(100).build());
if (assignment.getResolvedVariant().equals("treatment")) {
    // show the new checkout button
}
```

Kotlin uses the same artifact:

```kotlin
import io.github.pranav2012.abtestify.ABTestify
import io.github.pranav2012.abtestify.Params

val variant = ABTestify.getBucket(
    Params.builder("checkout-cta", "user123").treatmentSplit(50.0).exposure(100.0).build(),
).resolvedVariant

val withDefaults = ABTestify.getBucket("checkout-cta", "user123").resolvedVariant
```

Java 8 bytecode, so it works on Android too. Invalid input throws `InvalidParamsException`, an `IllegalArgumentException` whose `getField()` names the parameter.

### Swift

In `Package.swift` (the package's release tags are plain versions such as `0.3.0`):

```swift
dependencies: [
    .package(url: "https://github.com/pranav2012/abtestify.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "ABTestify", package: "abtestify")]),
]
```

Or in Xcode: File > Add Package Dependencies, and enter `https://github.com/pranav2012/abtestify.git`.

```swift
import ABTestify

let assignment = try ABTestify.bucket(
    experimentName: "checkout-cta",
    uniqueId: "user123",
    treatmentSplit: 50,
    exposure: 100
)
if assignment.resolvedVariant == "treatment" {
    // show the new checkout button
}
```

No dependencies and no CryptoKit, so it builds on Linux as well as Apple platforms.

## Parameters

Every port takes the same parameters, named in the language's own style (`treatmentSplit`, `treatment_split`, `TreatmentSplit`).

- `experimentName` (required): the name of the experiment. It is part of the hash, so each experiment splits users independently.
- `uniqueId` (required): a stable identifier for the user, such as a user ID or a device ID.
- `treatmentSplit` (optional, default `50`): the percentage of users in the experiment who get the treatment.
- `exposure` (optional, default `100`): the percentage of all users who are in the experiment. Everyone else gets the ignore variant.
- `controlVariantName` (optional, default `'control'`): the name of the control variant.
- `treatmentVariantName` (optional, default `'treatment'`): the name of the treatment variant.
- `ignoreVariantName` (optional, default `'ignore'`): the name returned for users outside the experiment.
- `legacyHashing` (optional, default `false`): bucket by `uniqueId` alone, as 0.1.x did. See [Upgrading from 0.1.x](#upgrading-from-01x).

Invalid input is an error in every port (in JavaScript, a thrown `Error`): an empty or non-string `uniqueId` or `experimentName`, or a `treatmentSplit` or `exposure` that isn't a number from 0 to 100.

## Output

- `experimentName`: the experiment name you passed.
- `uniqueId`: the user ID you passed.
- `resolvedVariant`: the variant the user is in: the treatment, control or ignore name.

## How bucketing works

The user's bucket is the first 8 bytes of SHA-256 of `experimentName:uniqueId`, mapped to one of 10,000 buckets. Exposure takes the lowest buckets, and the split uses the bucket's last two digits, which means:

- The same user gets the same variant in an experiment on every call, on every platform.
- Different experiments split users independently.
- Raising `exposure` (say from 10 to 50) only adds users. Nobody already in the experiment changes variant.
- Raising `treatmentSplit` only moves users from control to treatment.

## The cross-language guarantee

Every port produces byte-for-byte the same assignment as the TypeScript implementation for every input, including unicode IDs, fractional splits and `legacyHashing`. That rests on two details each port reproduces exactly:

- The key is UTF-8 encoded before hashing, with no unicode normalization, so `é` (U+00E9) and `e` + U+0301 are different users everywhere.
- The bucket is `floor(f64(top) / 2^64 * 10000)`, where `top` is the first 8 bytes of the digest as an unsigned 64-bit integer. JavaScript converts it with `Number(bigint)`, which rounds to the nearest double with ties to even, and its divisor `Number(2^64 - 1)` is exactly 2^64. Each port converts with the same rounding: Java, which has no unsigned 64-bit type, halves the value while keeping a sticky bit and doubles the result.

[`test-vectors/vectors.json`](test-vectors/vectors.json) enforces it. [`test-vectors/generate.mjs`](test-vectors/generate.mjs) writes it from the TypeScript implementation:

- **Hashing cases** (2,859): experiment name, ID, split, exposure, variant names and `legacyHashing`, with the expected bucket and variant. They cover ASCII, Japanese, emoji, combining marks, NUL and astral-plane characters, IDs of up to 10,000 characters across the SHA-256 padding boundaries, splits and exposures of 0, 100 and fractions such as 33.3, and thresholds set exactly on a user's bucket.
- **Bucket mapping cases** (4,919): 64-bit values and their buckets, testing the float conversion directly: 0, 2^53 ± 1, 2^63 ± 1, 2^64 - 1, ties that round to even at every exponent from 2^53 to 2^63, and values at and around the boundaries of hundreds of buckets. A conversion that truncates, rounds ties away from zero or uses exact integer division fails hundreds of these.
- **Error cases** (26): invalid percentages (negative, above 100, NaN, infinite), empty IDs, and the order in which fields are checked.

Each port's test suite loads the file and checks every case, CI runs all six on every pull request, and a CI step regenerates the file and fails if it differs from the committed copy. To change the algorithm deliberately, change the TypeScript, run `yarn build && yarn vectors`, and update every port until its tests pass.

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
