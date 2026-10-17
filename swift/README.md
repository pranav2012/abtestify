# abtestify for Swift

Deterministic A/B test bucketing for iOS, macOS, tvOS, watchOS, visionOS and
Linux. No dependencies, no CryptoKit. Assignments are byte-for-byte identical
to the [abtestify](https://github.com/pranav2012/abtestify) npm package and its
Go, Rust, Python and Java/Kotlin ports.

```swift
// Package.swift
dependencies: [
    .package(url: "https://github.com/pranav2012/abtestify.git", from: "<version>"),
],
targets: [
    .target(name: "App", dependencies: [.product(name: "ABTestify", package: "abtestify")]),
]
```

```swift
import ABTestify

let assignment = try ABTestify.bucket(
    experimentName: "checkout-cta",
    uniqueId: "user123",
    treatmentSplit: 50, // optional, default 50
    exposure: 100 // optional, default 100
)
if assignment.resolvedVariant == "treatment" {
    // show the new checkout button
}
```

Invalid input throws `ABTestifyError`; its `field` names the parameter.
The package manifest is `Package.swift` at the repository root; the sources
are in this directory.
