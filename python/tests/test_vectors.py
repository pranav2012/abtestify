"""Runs the shared test vectors in ../test-vectors/vectors.json."""

from __future__ import annotations

import json
import math
import unittest
from pathlib import Path

from abtestify import Assignment, get_ab_experiment_bucket
from abtestify._core import _bucket_from_top, _bucket_of

VECTORS = json.loads(
    (Path(__file__).resolve().parents[2] / "test-vectors" / "vectors.json").read_text(
        encoding="utf-8"
    )
)
SPECIAL = {"NaN": math.nan, "Infinity": math.inf, "-Infinity": -math.inf}
FIELDS = {
    "treatmentSplit": "treatment_split",
    "exposure": "exposure",
    "uniqueId": "unique_id",
    "experimentName": "experiment_name",
}


def number(value: float | str) -> float:
    return SPECIAL[value] if isinstance(value, str) else value


class VectorTests(unittest.TestCase):
    def test_bucket_cases(self) -> None:
        cases = VECTORS["bucketCases"]
        self.assertGreater(len(cases), 1000)
        for case in cases:
            top = int(case["top64Hex"], 16)
            self.assertEqual(_bucket_from_top(top), case["expectedBucket"], case["top64Hex"])

    def test_hashing_cases(self) -> None:
        cases = VECTORS["hashingCases"]
        self.assertGreaterEqual(len(cases), 2000)
        for i, case in enumerate(cases):
            key = (
                case["uniqueId"]
                if case["legacyHashing"]
                else f"{case['experimentName']}:{case['uniqueId']}"
            )
            self.assertEqual(_bucket_of(key), case["expectedBucket"], f"case {i}")
            result = get_ab_experiment_bucket(
                case["experimentName"],
                case["uniqueId"],
                treatment_split=case["treatmentSplit"],
                exposure=case["exposure"],
                treatment_variant_name=case["treatmentVariantName"],
                control_variant_name=case["controlVariantName"],
                ignore_variant_name=case["ignoreVariantName"],
                legacy_hashing=case["legacyHashing"],
            )
            self.assertEqual(
                result,
                Assignment(case["experimentName"], case["uniqueId"], case["expectedVariant"]),
                f"case {i}",
            )

    def test_error_cases(self) -> None:
        for case in VECTORS["errorCases"]:
            with self.subTest(case["description"]):
                with self.assertRaises(ValueError) as raised:
                    get_ab_experiment_bucket(
                        case["experimentName"],
                        case["uniqueId"],
                        treatment_split=number(case["treatmentSplit"]),
                        exposure=number(case["exposure"]),
                        legacy_hashing=case["legacyHashing"],
                    )
                field = FIELDS[case["expectedErrorField"]]
                self.assertTrue(str(raised.exception).startswith(f"{field} "))


class ApiTests(unittest.TestCase):
    def test_defaults(self) -> None:
        self.assertEqual(
            get_ab_experiment_bucket("checkout-cta", "user-5"),
            Assignment("checkout-cta", "user-5", "treatment"),
        )
        self.assertEqual(
            get_ab_experiment_bucket("checkout-cta", "user-5", treatment_split=0).resolved_variant,
            "control",
        )

    def test_type_errors(self) -> None:
        with self.assertRaisesRegex(TypeError, "^treatment_split "):
            get_ab_experiment_bucket("exp", "u", treatment_split="50")  # type: ignore[arg-type]
        with self.assertRaisesRegex(TypeError, "^exposure "):
            get_ab_experiment_bucket("exp", "u", exposure=True)
        with self.assertRaisesRegex(TypeError, "^unique_id "):
            get_ab_experiment_bucket("exp", 42)  # type: ignore[arg-type]
        with self.assertRaisesRegex(TypeError, "^experiment_name "):
            get_ab_experiment_bucket(None, "u")  # type: ignore[arg-type]

    def test_huge_int_is_out_of_range(self) -> None:
        with self.assertRaisesRegex(ValueError, "^exposure "):
            get_ab_experiment_bucket("exp", "u", exposure=10**400)

    def test_assignment_is_frozen(self) -> None:
        result = get_ab_experiment_bucket("exp", "u")
        with self.assertRaises(AttributeError):
            result.resolved_variant = "x"  # type: ignore[misc]


if __name__ == "__main__":
    unittest.main()
