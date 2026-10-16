# abtestify for Go

Deterministic A/B test bucketing. The same user always gets the same variant
in an experiment, with no storage and no network calls. Assignments are
identical to the [abtestify](https://github.com/pranav2012/abtestify) npm
package and its Rust, Python, Java/Kotlin and Swift ports.

```bash
go get github.com/pranav2012/abtestify/go
```

```go
import abtestify "github.com/pranav2012/abtestify/go"

result, err := abtestify.GetBucket(abtestify.Params{
	ExperimentName: "checkout-cta",
	UniqueID:       "user123",
	TreatmentSplit: abtestify.Float64(50), // optional, default 50
	Exposure:       abtestify.Float64(100), // optional, default 100
})
if err != nil {
	// *abtestify.ValidationError; err.(*abtestify.ValidationError).Field names the parameter
}
if result.ResolvedVariant == "treatment" {
	// show the new checkout button
}
```

Nil pointer fields take their defaults; `abtestify.String` sets the variant
names. See the [main README](https://github.com/pranav2012/abtestify#readme)
for how bucketing works.
