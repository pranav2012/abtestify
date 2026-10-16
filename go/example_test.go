package abtestify_test

import (
	"fmt"

	abtestify "github.com/pranav2012/abtestify/go"
)

func ExampleGetBucket() {
	result, err := abtestify.GetBucket(abtestify.Params{
		ExperimentName: "checkout-cta",
		UniqueID:       "user-5",
		TreatmentSplit: abtestify.Float64(50),
		Exposure:       abtestify.Float64(100),
	})
	if err != nil {
		panic(err)
	}
	fmt.Println(result.ResolvedVariant)
	// Output: treatment
}
