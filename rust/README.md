# abtestify

Deterministic A/B test bucketing for Rust. Give it an experiment name and a
user ID and it returns the same variant for that user every time, with no
storage, no network calls and no dependencies.

Assignments are byte-for-byte identical to the
[abtestify npm package](https://www.npmjs.com/package/abtestify) and its Go,
Python, Java/Kotlin and Swift ports, so a user lands in the same variant on
every platform. Shared test vectors in the
[repository](https://github.com/pranav2012/abtestify) enforce it.

```toml
[dependencies]
abtestify = "0.3"
```

```rust
use abtestify::{get_bucket, Params};

let params = Params::new("checkout-cta", "user123")
    .treatment_split(50.0) // optional, default 50
    .exposure(100.0); // optional, default 100

match get_bucket(&params) {
    Ok(assignment) if assignment.resolved_variant == "treatment" => {
        // show the new checkout button
    }
    Ok(_) => {}
    Err(err) => eprintln!("invalid experiment config: {err}"),
}
```

`Params` also takes `treatment_variant_name`, `control_variant_name`,
`ignore_variant_name` and `legacy_hashing`. `get_bucket` returns an `Error`
when a percentage is not a finite number from 0 to 100 or a required name is
empty.

The bucket is the first 8 bytes of SHA-256 of `experiment_name:unique_id`,
mapped to one of 10,000 buckets. Exposure takes the lowest buckets, and the
split uses the bucket's last two digits, so raising `exposure` only adds users
and raising `treatment_split` only moves users from control to treatment.

Licensed under MIT.
