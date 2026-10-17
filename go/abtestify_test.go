package abtestify

import (
	"encoding/json"
	"errors"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"testing"
)

type vectorFile struct {
	BucketCases []struct {
		Top64Hex       string `json:"top64Hex"`
		ExpectedBucket int    `json:"expectedBucket"`
	} `json:"bucketCases"`
	HashingCases []struct {
		ExperimentName       string  `json:"experimentName"`
		UniqueID             string  `json:"uniqueId"`
		TreatmentSplit       float64 `json:"treatmentSplit"`
		Exposure             float64 `json:"exposure"`
		TreatmentVariantName string  `json:"treatmentVariantName"`
		ControlVariantName   string  `json:"controlVariantName"`
		IgnoreVariantName    string  `json:"ignoreVariantName"`
		LegacyHashing        bool    `json:"legacyHashing"`
		ExpectedBucket       int     `json:"expectedBucket"`
		ExpectedVariant      string  `json:"expectedVariant"`
	} `json:"hashingCases"`
	ErrorCases []struct {
		Description        string          `json:"description"`
		ExperimentName     string          `json:"experimentName"`
		UniqueID           string          `json:"uniqueId"`
		TreatmentSplit     json.RawMessage `json:"treatmentSplit"`
		Exposure           json.RawMessage `json:"exposure"`
		LegacyHashing      bool            `json:"legacyHashing"`
		ExpectedErrorField string          `json:"expectedErrorField"`
	} `json:"errorCases"`
}

func loadVectors(t *testing.T) vectorFile {
	t.Helper()
	data, err := os.ReadFile(filepath.Join("..", "test-vectors", "vectors.json"))
	if err != nil {
		t.Fatalf("reading vectors: %v", err)
	}
	var v vectorFile
	if err := json.Unmarshal(data, &v); err != nil {
		t.Fatalf("parsing vectors: %v", err)
	}
	return v
}

// decodeNumber reads a JSON number or one of "NaN", "Infinity", "-Infinity".
func decodeNumber(t *testing.T, raw json.RawMessage) float64 {
	t.Helper()
	var s string
	if json.Unmarshal(raw, &s) == nil {
		switch s {
		case "NaN":
			return math.NaN()
		case "Infinity":
			return math.Inf(1)
		case "-Infinity":
			return math.Inf(-1)
		}
		t.Fatalf("unknown special number %q", s)
	}
	var f float64
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatalf("bad number %s: %v", raw, err)
	}
	return f
}

func TestBucketVectors(t *testing.T) {
	v := loadVectors(t)
	if len(v.BucketCases) < 1000 {
		t.Fatalf("only %d bucket cases", len(v.BucketCases))
	}
	for _, c := range v.BucketCases {
		top, err := strconv.ParseUint(c.Top64Hex, 16, 64)
		if err != nil {
			t.Fatal(err)
		}
		if got := bucketFromTop(top); got != c.ExpectedBucket {
			t.Errorf("bucketFromTop(0x%s) = %d, want %d", c.Top64Hex, got, c.ExpectedBucket)
		}
	}
}

func TestHashingVectors(t *testing.T) {
	v := loadVectors(t)
	if len(v.HashingCases) < 2000 {
		t.Fatalf("only %d hashing cases", len(v.HashingCases))
	}
	for i, c := range v.HashingCases {
		key := c.ExperimentName + ":" + c.UniqueID
		if c.LegacyHashing {
			key = c.UniqueID
		}
		if got := bucketOf(key); got != c.ExpectedBucket {
			t.Errorf("case %d: bucketOf = %d, want %d", i, got, c.ExpectedBucket)
		}
		res, err := GetBucket(Params{
			ExperimentName:       c.ExperimentName,
			UniqueID:             c.UniqueID,
			TreatmentSplit:       Float64(c.TreatmentSplit),
			Exposure:             Float64(c.Exposure),
			TreatmentVariantName: String(c.TreatmentVariantName),
			ControlVariantName:   String(c.ControlVariantName),
			IgnoreVariantName:    String(c.IgnoreVariantName),
			LegacyHashing:        c.LegacyHashing,
		})
		if err != nil {
			t.Errorf("case %d: unexpected error %v", i, err)
			continue
		}
		want := Result{ExperimentName: c.ExperimentName, UniqueID: c.UniqueID, ResolvedVariant: c.ExpectedVariant}
		if res != want {
			t.Errorf("case %d: got %+v, want %+v", i, res, want)
		}
	}
}

func TestErrorVectors(t *testing.T) {
	v := loadVectors(t)
	for _, c := range v.ErrorCases {
		_, err := GetBucket(Params{
			ExperimentName: c.ExperimentName,
			UniqueID:       c.UniqueID,
			TreatmentSplit: Float64(decodeNumber(t, c.TreatmentSplit)),
			Exposure:       Float64(decodeNumber(t, c.Exposure)),
			LegacyHashing:  c.LegacyHashing,
		})
		var ve *ValidationError
		if !errors.As(err, &ve) {
			t.Errorf("%s: got %v, want a *ValidationError", c.Description, err)
			continue
		}
		if ve.Field != c.ExpectedErrorField {
			t.Errorf("%s: field %q, want %q", c.Description, ve.Field, c.ExpectedErrorField)
		}
	}
}

func TestDefaults(t *testing.T) {
	explicit, err := GetBucket(Params{
		ExperimentName:       "checkout-cta",
		UniqueID:             "user-5",
		TreatmentSplit:       Float64(50),
		Exposure:             Float64(100),
		TreatmentVariantName: String("treatment"),
		ControlVariantName:   String("control"),
		IgnoreVariantName:    String("ignore"),
	})
	if err != nil {
		t.Fatal(err)
	}
	defaulted, err := GetBucket(Params{ExperimentName: "checkout-cta", UniqueID: "user-5"})
	if err != nil {
		t.Fatal(err)
	}
	if defaulted != explicit || defaulted.ResolvedVariant != "treatment" {
		t.Fatalf("defaults: got %+v, want %+v", defaulted, explicit)
	}

	// An explicit 0% split is not the default 50%.
	zero, err := GetBucket(Params{ExperimentName: "checkout-cta", UniqueID: "user-5", TreatmentSplit: Float64(0)})
	if err != nil {
		t.Fatal(err)
	}
	if zero.ResolvedVariant != "control" {
		t.Fatalf("0%% split: got %q, want control", zero.ResolvedVariant)
	}
}

func TestErrorMessage(t *testing.T) {
	_, err := GetBucket(Params{ExperimentName: "exp", UniqueID: "u", Exposure: Float64(101)})
	want := "exposure must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the experiment."
	if err == nil || err.Error() != want {
		t.Fatalf("got %v, want %q", err, want)
	}
}
