"""Deterministic A/B test bucketing.

Assignments are byte-for-byte identical to the abtestify npm package and its
Go, Rust, Java/Kotlin and Swift ports.
"""

from ._core import Assignment, get_ab_experiment_bucket

__all__ = ["Assignment", "get_ab_experiment_bucket"]
