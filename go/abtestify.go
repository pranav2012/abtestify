// Package abtestify assigns users to A/B test variants deterministically.
//
// The variant comes from SHA-256 of "experimentName:uniqueID", so a user
// always gets the same variant within an experiment and independent variants
// across experiments. Assignments are byte-for-byte identical to the
// abtestify npm package and every other port; the shared test vectors in the
// repository enforce it.
package abtestify

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"math"
)

const (
	// DefaultTreatmentSplit is the treatment percentage used when Params.TreatmentSplit is nil.
	DefaultTreatmentSplit = 50.0
	// DefaultExposure is the exposure percentage used when Params.Exposure is nil.
	DefaultExposure = 100.0
	// DefaultTreatmentVariantName is returned for treatment users unless overridden.
	DefaultTreatmentVariantName = "treatment"
	// DefaultControlVariantName is returned for control users unless overridden.
	DefaultControlVariantName = "control"
	// DefaultIgnoreVariantName is returned for users outside the exposure unless overridden.
	DefaultIgnoreVariantName = "ignore"
)

// Params describes one assignment. Nil pointer fields take their defaults, so
// an explicit zero (a 0% split, an empty variant name) stays distinguishable
// from "not set". Use Float64 and String to fill them inline.
type Params struct {
	// ExperimentName is part of the hash. Required unless LegacyHashing is set.
	ExperimentName string
	// UniqueID is a stable user identifier. Required.
	UniqueID string
	// TreatmentSplit is the percentage of exposed users who get the treatment, 0 to 100. Default 50.
	TreatmentSplit *float64
	// Exposure is the percentage of all users in the experiment, 0 to 100. Default 100.
	Exposure *float64
	// TreatmentVariantName defaults to "treatment".
	TreatmentVariantName *string
	// ControlVariantName defaults to "control".
	ControlVariantName *string
	// IgnoreVariantName defaults to "ignore".
	IgnoreVariantName *string
	// LegacyHashing buckets by UniqueID alone, as abtestify 0.1.x did.
	LegacyHashing bool
}

// Result is the assignment for one user.
type Result struct {
	ExperimentName  string
	UniqueID        string
	ResolvedVariant string
}

// ValidationError reports an invalid Params field. Field uses the
// cross-language parameter name, e.g. "treatmentSplit" or "uniqueId".
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

// Float64 returns a pointer to v, for Params.TreatmentSplit and Params.Exposure.
func Float64(v float64) *float64 { return &v }

// String returns a pointer to s, for the variant name fields of Params.
func String(s string) *string { return &s }

// GetBucket assigns p.UniqueID to a variant of p.ExperimentName. It returns a
// *ValidationError when a percentage is not a finite number in [0, 100], the
// unique ID is empty, or the experiment name is empty without LegacyHashing.
func GetBucket(p Params) (Result, error) {
	split := floatOr(p.TreatmentSplit, DefaultTreatmentSplit)
	exposure := floatOr(p.Exposure, DefaultExposure)

	if err := checkPercentage("treatmentSplit", split, "the treatment group"); err != nil {
		return Result{}, err
	}
	if err := checkPercentage("exposure", exposure, "the experiment"); err != nil {
		return Result{}, err
	}
	if p.UniqueID == "" {
		return Result{}, &ValidationError{Field: "uniqueId", Message: "uniqueId must be a non-empty string."}
	}
	if !p.LegacyHashing && p.ExperimentName == "" {
		return Result{}, &ValidationError{Field: "experimentName", Message: "experimentName must be a non-empty string."}
	}

	key := p.ExperimentName + ":" + p.UniqueID
	if p.LegacyHashing {
		key = p.UniqueID
	}
	bucket := bucketOf(key)

	var variant string
	switch {
	case float64(bucket)/100 >= exposure:
		variant = stringOr(p.IgnoreVariantName, DefaultIgnoreVariantName)
	case float64(bucket%100) < split:
		variant = stringOr(p.TreatmentVariantName, DefaultTreatmentVariantName)
	default:
		variant = stringOr(p.ControlVariantName, DefaultControlVariantName)
	}
	return Result{ExperimentName: p.ExperimentName, UniqueID: p.UniqueID, ResolvedVariant: variant}, nil
}

// bucketOf maps a key to a bucket from the first 8 bytes of its SHA-256.
func bucketOf(key string) int {
	digest := sha256.Sum256([]byte(key))
	return bucketFromTop(binary.BigEndian.Uint64(digest[:8]))
}

// bucketFromTop maps a 64-bit value to [0, 10000] exactly as JavaScript's
// Math.floor(Number(top) / Number(2n**64n - 1n) * 10000) does. Go's
// uint64 -> float64 conversion rounds to nearest, ties to even, like Number(),
// and Number(2^64 - 1) is exactly 2^64.
func bucketFromTop(top uint64) int {
	return int(math.Floor(float64(top) / 18446744073709551616.0 * 10000))
}

func checkPercentage(name string, v float64, meaning string) error {
	if math.IsNaN(v) || math.IsInf(v, 0) || v < 0 || v > 100 {
		return &ValidationError{
			Field: name,
			Message: fmt.Sprintf(
				"%s must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into %s.",
				name, meaning),
		}
	}
	return nil
}

func floatOr(p *float64, def float64) float64 {
	if p == nil {
		return def
	}
	return *p
}

func stringOr(p *string, def string) string {
	if p == nil {
		return def
	}
	return *p
}
