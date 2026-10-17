from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass

BUCKETS = 10000
_TWO_POW_64 = 18446744073709551616.0


@dataclass(frozen=True)
class Assignment:
    """The variant a user is assigned to."""

    experiment_name: str
    unique_id: str
    resolved_variant: str


def get_ab_experiment_bucket(
    experiment_name: str,
    unique_id: str,
    *,
    treatment_split: float = 50,
    exposure: float = 100,
    treatment_variant_name: str = "treatment",
    control_variant_name: str = "control",
    ignore_variant_name: str = "ignore",
    legacy_hashing: bool = False,
) -> Assignment:
    """Deterministically assign ``unique_id`` to a variant of ``experiment_name``.

    The bucket comes from SHA-256 of ``experiment_name:unique_id``, so a user
    always gets the same variant within an experiment, and independent
    variants across experiments. Raising ``exposure`` only adds users.

    Raises TypeError for a non-numeric percentage or a non-string ID, and
    ValueError for a percentage outside 0..100 (or NaN/infinite) or an empty
    ID. Checks run in the order treatment_split, exposure, unique_id,
    experiment_name; experiment_name may be empty when ``legacy_hashing``.
    """
    split = _percentage("treatment_split", treatment_split, "the treatment group")
    exposed = _percentage("exposure", exposure, "the experiment")
    _text("unique_id", unique_id)
    if not legacy_hashing:
        _text("experiment_name", experiment_name)

    key = unique_id if legacy_hashing else f"{experiment_name}:{unique_id}"
    bucket = _bucket_of(key)

    if bucket / 100 >= exposed:
        variant = ignore_variant_name
    elif bucket % 100 < split:
        variant = treatment_variant_name
    else:
        variant = control_variant_name
    return Assignment(experiment_name, unique_id, variant)


def _bucket_of(key: str) -> int:
    """Map a key to a bucket from the first 8 bytes of its SHA-256."""
    top = int.from_bytes(hashlib.sha256(key.encode("utf-8")).digest()[:8], "big")
    return _bucket_from_top(top)


def _bucket_from_top(top: int) -> int:
    """Map a 64-bit value to [0, 10000] as JavaScript's
    ``Math.floor(Number(top) / Number(2n ** 64n - 1n) * 10000)`` does.
    ``float(int)`` rounds to nearest, ties to even, like ``Number()``, and
    ``Number(2^64 - 1)`` is exactly 2^64."""
    return math.floor(float(top) / _TWO_POW_64 * BUCKETS)


def _percentage(name: str, value: object, meaning: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError(
            f"{name} must be a number between 0 and 100, got {type(value).__name__}."
        )
    try:
        number = float(value)
    except OverflowError:
        number = math.inf
    if not math.isfinite(number) or number < 0 or number > 100:
        raise ValueError(
            f"{name} must be a number between 0 and 100 as it represents the "
            f"percentage of users who will be bucketed into {meaning}."
        )
    return number


def _text(name: str, value: object) -> None:
    if not isinstance(value, str):
        raise TypeError(f"{name} must be a non-empty string, got {type(value).__name__}.")
    if not value:
        raise ValueError(f"{name} must be a non-empty string.")
