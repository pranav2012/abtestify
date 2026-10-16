//! Runs the shared test vectors in `../test-vectors/vectors.json`.

use super::{bucket_from_top, bucket_of, get_bucket, Assignment, Params};
use serde_json::Value;

fn vectors() -> Value {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../test-vectors/vectors.json");
    let text = std::fs::read_to_string(path).expect("reading vectors.json");
    serde_json::from_str(&text).expect("parsing vectors.json")
}

fn str_of<'a>(case: &'a Value, key: &str) -> &'a str {
    case[key]
        .as_str()
        .unwrap_or_else(|| panic!("{} is not a string", key))
}

/// Reads a JSON number or one of "NaN", "Infinity", "-Infinity".
fn number_of(case: &Value, key: &str) -> f64 {
    match &case[key] {
        Value::String(s) => match s.as_str() {
            "NaN" => f64::NAN,
            "Infinity" => f64::INFINITY,
            "-Infinity" => f64::NEG_INFINITY,
            other => panic!("unknown special number {}", other),
        },
        v => v
            .as_f64()
            .unwrap_or_else(|| panic!("{} is not a number", key)),
    }
}

#[test]
fn bucket_cases() {
    let v = vectors();
    let cases = v["bucketCases"].as_array().unwrap();
    assert!(cases.len() > 1000);
    for case in cases {
        let hex = str_of(case, "top64Hex");
        let top = u64::from_str_radix(hex, 16).unwrap();
        let expected = case["expectedBucket"].as_u64().unwrap() as u32;
        assert_eq!(bucket_from_top(top), expected, "top64Hex {}", hex);
    }
}

#[test]
fn hashing_cases() {
    let v = vectors();
    let cases = v["hashingCases"].as_array().unwrap();
    assert!(cases.len() >= 2000);
    for (i, case) in cases.iter().enumerate() {
        let params = Params {
            experiment_name: str_of(case, "experimentName"),
            unique_id: str_of(case, "uniqueId"),
            treatment_split: number_of(case, "treatmentSplit"),
            exposure: number_of(case, "exposure"),
            treatment_variant_name: str_of(case, "treatmentVariantName"),
            control_variant_name: str_of(case, "controlVariantName"),
            ignore_variant_name: str_of(case, "ignoreVariantName"),
            legacy_hashing: case["legacyHashing"].as_bool().unwrap(),
        };
        let key = if params.legacy_hashing {
            params.unique_id.to_owned()
        } else {
            format!("{}:{}", params.experiment_name, params.unique_id)
        };
        let expected_bucket = case["expectedBucket"].as_u64().unwrap() as u32;
        assert_eq!(bucket_of(key.as_bytes()), expected_bucket, "case {}", i);
        assert_eq!(
            get_bucket(&params).unwrap(),
            Assignment {
                experiment_name: params.experiment_name.to_owned(),
                unique_id: params.unique_id.to_owned(),
                resolved_variant: str_of(case, "expectedVariant").to_owned(),
            },
            "case {}",
            i
        );
    }
}

#[test]
fn error_cases() {
    let v = vectors();
    for case in v["errorCases"].as_array().unwrap() {
        let params = Params {
            experiment_name: str_of(case, "experimentName"),
            unique_id: str_of(case, "uniqueId"),
            treatment_split: number_of(case, "treatmentSplit"),
            exposure: number_of(case, "exposure"),
            legacy_hashing: case["legacyHashing"].as_bool().unwrap(),
            ..Params::default()
        };
        let expected = match str_of(case, "expectedErrorField") {
            "treatmentSplit" => "treatment_split",
            "exposure" => "exposure",
            "uniqueId" => "unique_id",
            "experimentName" => "experiment_name",
            other => panic!("unknown field {}", other),
        };
        let err = get_bucket(&params).expect_err(str_of(case, "description"));
        assert_eq!(err.field(), expected, "{}", str_of(case, "description"));
    }
}

#[test]
fn defaults_match_explicit_values() {
    let explicit = Params::new("checkout-cta", "user-5")
        .treatment_split(50.0)
        .exposure(100.0)
        .treatment_variant_name("treatment")
        .control_variant_name("control")
        .ignore_variant_name("ignore")
        .legacy_hashing(false);
    assert_eq!(explicit, Params::new("checkout-cta", "user-5"));
    assert_eq!(get_bucket(&explicit).unwrap().resolved_variant, "treatment");
}
