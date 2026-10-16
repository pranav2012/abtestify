//! Deterministic A/B test bucketing.
//!
//! [`get_bucket`] hashes `experiment_name:unique_id` with SHA-256 and maps it to
//! one of 10,000 buckets, so a user always gets the same variant within an
//! experiment and independent variants across experiments. Raising `exposure`
//! only adds users; it never moves anyone between variants.
//!
//! Assignments are byte-for-byte identical to the
//! [abtestify npm package](https://www.npmjs.com/package/abtestify) and the Go,
//! Python, Java/Kotlin and Swift ports. Shared test vectors in the repository
//! enforce it. The crate has no dependencies.
//!
//! ```
//! use abtestify::{get_bucket, Params};
//!
//! let assignment = get_bucket(&Params::new("checkout-cta", "user-5")).unwrap();
//! assert_eq!(assignment.resolved_variant, "treatment");
//!
//! let ramp = Params::new("checkout-cta", "user-5")
//!     .treatment_split(20.0)
//!     .exposure(10.0);
//! println!("{}", get_bucket(&ramp)?.resolved_variant);
//! # Ok::<(), abtestify::Error>(())
//! ```
#![forbid(unsafe_code)]
#![warn(missing_docs)]

use std::fmt;

mod sha256;

/// Number of buckets users are spread across.
pub const BUCKETS: u32 = 10_000;

/// Input for [`get_bucket`].
///
/// [`Params::new`] fills in the defaults; the builder methods override them.
/// [`Default`] gives the same defaults with empty names.
#[derive(Debug, Clone, PartialEq)]
pub struct Params<'a> {
    /// Name of the experiment; part of the hash. Required unless `legacy_hashing`.
    pub experiment_name: &'a str,
    /// Stable identifier for the user, such as a user ID or device ID. Required.
    pub unique_id: &'a str,
    /// Percentage of exposed users who get the treatment, 0 to 100. Default 50.
    pub treatment_split: f64,
    /// Percentage of all users in the experiment, 0 to 100. Default 100.
    pub exposure: f64,
    /// Variant name for treatment users. Default `"treatment"`.
    pub treatment_variant_name: &'a str,
    /// Variant name for control users. Default `"control"`.
    pub control_variant_name: &'a str,
    /// Variant name for users outside the exposure. Default `"ignore"`.
    pub ignore_variant_name: &'a str,
    /// Bucket by `unique_id` alone, as abtestify 0.1.x did. Default `false`.
    pub legacy_hashing: bool,
}

impl Default for Params<'_> {
    fn default() -> Self {
        Params {
            experiment_name: "",
            unique_id: "",
            treatment_split: 50.0,
            exposure: 100.0,
            treatment_variant_name: "treatment",
            control_variant_name: "control",
            ignore_variant_name: "ignore",
            legacy_hashing: false,
        }
    }
}

impl<'a> Params<'a> {
    /// Params for `unique_id` in `experiment_name`, with every other field at its default.
    pub fn new(experiment_name: &'a str, unique_id: &'a str) -> Self {
        Params {
            experiment_name,
            unique_id,
            ..Params::default()
        }
    }

    /// Sets the percentage of exposed users who get the treatment.
    pub fn treatment_split(mut self, percent: f64) -> Self {
        self.treatment_split = percent;
        self
    }

    /// Sets the percentage of all users who are in the experiment.
    pub fn exposure(mut self, percent: f64) -> Self {
        self.exposure = percent;
        self
    }

    /// Sets the treatment variant name.
    pub fn treatment_variant_name(mut self, name: &'a str) -> Self {
        self.treatment_variant_name = name;
        self
    }

    /// Sets the control variant name.
    pub fn control_variant_name(mut self, name: &'a str) -> Self {
        self.control_variant_name = name;
        self
    }

    /// Sets the name returned for users outside the exposure.
    pub fn ignore_variant_name(mut self, name: &'a str) -> Self {
        self.ignore_variant_name = name;
        self
    }

    /// Buckets by `unique_id` alone, as abtestify 0.1.x did.
    pub fn legacy_hashing(mut self, enabled: bool) -> Self {
        self.legacy_hashing = enabled;
        self
    }
}

/// The variant a user is assigned to.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Assignment {
    /// The experiment name that was passed in.
    pub experiment_name: String,
    /// The unique ID that was passed in.
    pub unique_id: String,
    /// The treatment, control or ignore variant name.
    pub resolved_variant: String,
}

/// Invalid input to [`get_bucket`]. Fields are checked in declaration order.
#[derive(Debug, Clone, PartialEq)]
#[non_exhaustive]
pub enum Error {
    /// `treatment_split` is not a finite number from 0 to 100.
    InvalidTreatmentSplit(f64),
    /// `exposure` is not a finite number from 0 to 100.
    InvalidExposure(f64),
    /// `unique_id` is empty.
    EmptyUniqueId,
    /// `experiment_name` is empty and `legacy_hashing` is off.
    EmptyExperimentName,
}

impl Error {
    /// The name of the offending [`Params`] field, e.g. `"treatment_split"`.
    pub fn field(&self) -> &'static str {
        match self {
            Error::InvalidTreatmentSplit(_) => "treatment_split",
            Error::InvalidExposure(_) => "exposure",
            Error::EmptyUniqueId => "unique_id",
            Error::EmptyExperimentName => "experiment_name",
        }
    }
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::InvalidTreatmentSplit(v) => write!(
                f,
                "treatment_split must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the treatment group (got {})",
                v
            ),
            Error::InvalidExposure(v) => write!(
                f,
                "exposure must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the experiment (got {})",
                v
            ),
            Error::EmptyUniqueId => f.write_str("unique_id must be a non-empty string"),
            Error::EmptyExperimentName => f.write_str("experiment_name must be a non-empty string"),
        }
    }
}

impl std::error::Error for Error {}

/// Assigns `params.unique_id` to a variant of `params.experiment_name`.
///
/// # Errors
///
/// Returns an [`Error`] when `treatment_split` or `exposure` is not a finite
/// number from 0 to 100, `unique_id` is empty, or `experiment_name` is empty
/// without `legacy_hashing`, checked in that order.
pub fn get_bucket(params: &Params<'_>) -> Result<Assignment, Error> {
    if !is_percentage(params.treatment_split) {
        return Err(Error::InvalidTreatmentSplit(params.treatment_split));
    }
    if !is_percentage(params.exposure) {
        return Err(Error::InvalidExposure(params.exposure));
    }
    if params.unique_id.is_empty() {
        return Err(Error::EmptyUniqueId);
    }
    if !params.legacy_hashing && params.experiment_name.is_empty() {
        return Err(Error::EmptyExperimentName);
    }

    let bucket = if params.legacy_hashing {
        bucket_of(params.unique_id.as_bytes())
    } else {
        let mut key =
            String::with_capacity(params.experiment_name.len() + 1 + params.unique_id.len());
        key.push_str(params.experiment_name);
        key.push(':');
        key.push_str(params.unique_id);
        bucket_of(key.as_bytes())
    };

    let variant = if f64::from(bucket) / 100.0 >= params.exposure {
        params.ignore_variant_name
    } else if f64::from(bucket % 100) < params.treatment_split {
        params.treatment_variant_name
    } else {
        params.control_variant_name
    };

    Ok(Assignment {
        experiment_name: params.experiment_name.to_owned(),
        unique_id: params.unique_id.to_owned(),
        resolved_variant: variant.to_owned(),
    })
}

fn is_percentage(v: f64) -> bool {
    v.is_finite() && (0.0..=100.0).contains(&v)
}

/// Maps a key to a bucket from the first 8 bytes of its SHA-256.
pub(crate) fn bucket_of(key: &[u8]) -> u32 {
    let digest = sha256::sha256(key);
    let mut top = [0u8; 8];
    top.copy_from_slice(&digest[..8]);
    bucket_from_top(u64::from_be_bytes(top))
}

/// Maps a 64-bit value to `[0, 10000]` exactly as JavaScript's
/// `Math.floor(Number(top) / Number(2n ** 64n - 1n) * 10000)` does.
/// `u64 as f64` rounds to nearest, ties to even, like `Number()`, and
/// `Number(2^64 - 1)` is exactly 2^64.
pub(crate) fn bucket_from_top(top: u64) -> u32 {
    ((top as f64) / 18_446_744_073_709_551_616.0 * f64::from(BUCKETS)).floor() as u32
}

#[cfg(test)]
mod vector_tests;
