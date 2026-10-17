# abtestify

Deterministic A/B test bucketing for Python. Give it an experiment name and a
user ID and it returns the same variant for that user every time, with no
storage, no network calls and no dependencies.

Assignments are byte-for-byte identical to the
[abtestify npm package](https://www.npmjs.com/package/abtestify) and its Go,
Rust, Java/Kotlin and Swift ports, so a user lands in the same variant on every
platform. Shared test vectors in the
[repository](https://github.com/pranav2012/abtestify) enforce it.

```bash
pip install abtestify
```

```python
from abtestify import get_ab_experiment_bucket

assignment = get_ab_experiment_bucket(
    "checkout-cta",
    "user123",
    treatment_split=50,  # optional, default 50
    exposure=100,  # optional, default 100
)
if assignment.resolved_variant == "treatment":
    ...  # show the new checkout button
```

Keyword-only options: `treatment_split`, `exposure`, `treatment_variant_name`,
`control_variant_name`, `ignore_variant_name` and `legacy_hashing`. The result
is a frozen dataclass with `experiment_name`, `unique_id` and
`resolved_variant`.

Invalid input raises `TypeError` (a non-numeric percentage or a non-string ID)
or `ValueError` (a percentage that is not a finite number from 0 to 100, or an
empty ID).

The bucket is the first 8 bytes of SHA-256 of `experiment_name:unique_id`,
mapped to one of 10,000 buckets. Exposure takes the lowest buckets, and the
split uses the bucket's last two digits, so raising `exposure` only adds users
and raising `treatment_split` only moves users from control to treatment.

Requires Python 3.9 or later. Licensed under MIT.
