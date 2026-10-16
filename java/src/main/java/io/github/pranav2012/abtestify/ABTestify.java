package io.github.pranav2012.abtestify;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Deterministic A/B test bucketing.
 *
 * <p>The bucket comes from SHA-256 of {@code experimentName:uniqueId}, so a user always gets the
 * same variant within an experiment and independent variants across experiments. Raising the
 * exposure only adds users; it never moves anyone between variants.
 *
 * <p>Assignments are byte-for-byte identical to the abtestify npm package and its Go, Rust,
 * Python and Swift ports; shared test vectors enforce it.
 *
 * <pre>{@code
 * Assignment a = ABTestify.getBucket(
 *     Params.builder("checkout-cta", "user123").treatmentSplit(50).exposure(100).build());
 * if (a.getResolvedVariant().equals("treatment")) { ... }
 * }</pre>
 */
public final class ABTestify {
    /** Number of buckets users are spread across. */
    public static final int BUCKETS = 10000;

    private static final double TWO_POW_64 = 18446744073709551616.0;

    private ABTestify() {}

    /**
     * Assigns {@code uniqueId} to a variant of {@code experimentName} with the default split (50),
     * exposure (100) and variant names.
     *
     * @throws InvalidParamsException if either string is null or empty
     */
    public static Assignment getBucket(String experimentName, String uniqueId) {
        return getBucket(Params.builder(experimentName, uniqueId).build());
    }

    /**
     * Assigns {@code params.getUniqueId()} to a variant of {@code params.getExperimentName()}.
     *
     * @throws InvalidParamsException (an {@link IllegalArgumentException}) when the treatment split
     *     or exposure is not a finite number from 0 to 100, the unique ID is null or empty, or the
     *     experiment name is null or empty without legacy hashing, checked in that order
     */
    public static Assignment getBucket(Params params) {
        checkPercentage("treatmentSplit", params.getTreatmentSplit(), "the treatment group");
        checkPercentage("exposure", params.getExposure(), "the experiment");
        String uniqueId = params.getUniqueId();
        if (uniqueId == null || uniqueId.isEmpty()) {
            throw new InvalidParamsException("uniqueId", "uniqueId must be a non-empty string.");
        }
        String experimentName = params.getExperimentName();
        if (!params.isLegacyHashing() && (experimentName == null || experimentName.isEmpty())) {
            throw new InvalidParamsException(
                    "experimentName", "experimentName must be a non-empty string.");
        }

        int bucket = bucketOf(params.isLegacyHashing() ? uniqueId : experimentName + ":" + uniqueId);

        String variant;
        if (bucket / 100.0 >= params.getExposure()) {
            variant = params.getIgnoreVariantName();
        } else if (bucket % 100 < params.getTreatmentSplit()) {
            variant = params.getTreatmentVariantName();
        } else {
            variant = params.getControlVariantName();
        }
        return new Assignment(experimentName, uniqueId, variant);
    }

    /** Maps a key to a bucket from the first 8 bytes of the SHA-256 of its UTF-8 bytes. */
    static int bucketOf(String key) {
        byte[] digest = sha256().digest(key.getBytes(StandardCharsets.UTF_8));
        long top = 0;
        for (int i = 0; i < 8; i++) {
            top = (top << 8) | (digest[i] & 0xFF);
        }
        return bucketFromTop(top);
    }

    /**
     * Maps an unsigned 64-bit value (held in a long) to [0, 10000] exactly as JavaScript's {@code
     * Math.floor(Number(top) / Number(2n ** 64n - 1n) * 10000)} does. Number(2^64 - 1) is exactly
     * 2^64.
     */
    static int bucketFromTop(long top) {
        return (int) Math.floor(unsignedToDouble(top) / TWO_POW_64 * BUCKETS);
    }

    /**
     * Converts an unsigned 64-bit value to the nearest double, ties to even, like JavaScript's
     * Number(bigint). Java's long-to-double rounds that way for signed values; for values of 2^63
     * and above, halve first while keeping the lowest bit as a sticky bit so the single rounding
     * step still sees whether the discarded bits were exactly half, then double the result.
     */
    static double unsignedToDouble(long x) {
        if (x >= 0) {
            return (double) x;
        }
        return (double) ((x >>> 1) | (x & 1)) * 2.0;
    }

    private static void checkPercentage(String name, double value, String meaning) {
        if (Double.isNaN(value) || Double.isInfinite(value) || value < 0 || value > 100) {
            throw new InvalidParamsException(
                    name,
                    name
                            + " must be a number between 0 and 100 as it represents the percentage of"
                            + " users who will be bucketed into "
                            + meaning
                            + ".");
        }
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            // Every Java platform is required to provide SHA-256.
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
