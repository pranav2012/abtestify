package io.github.pranav2012.abtestify;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Runs the shared test vectors in ../test-vectors/vectors.json. */
class VectorsTest {
    private static JsonObject vectors;

    @BeforeAll
    static void load() throws IOException {
        Path path = Paths.get("..", "test-vectors", "vectors.json");
        vectors = JsonParser.parseString(new String(Files.readAllBytes(path), StandardCharsets.UTF_8))
                .getAsJsonObject();
    }

    /** Reads a JSON number or one of "NaN", "Infinity", "-Infinity". */
    private static double number(JsonElement e) {
        if (e.getAsJsonPrimitive().isString()) {
            switch (e.getAsString()) {
                case "NaN":
                    return Double.NaN;
                case "Infinity":
                    return Double.POSITIVE_INFINITY;
                case "-Infinity":
                    return Double.NEGATIVE_INFINITY;
                default:
                    throw new IllegalArgumentException(e.getAsString());
            }
        }
        return e.getAsDouble();
    }

    private static String str(JsonObject o, String key) {
        return o.get(key).getAsString();
    }

    @Test
    void bucketCases() {
        JsonArray cases = vectors.getAsJsonArray("bucketCases");
        assertTrue(cases.size() > 1000);
        for (JsonElement e : cases) {
            JsonObject c = e.getAsJsonObject();
            String hex = str(c, "top64Hex");
            long top = Long.parseUnsignedLong(hex, 16);
            assertEquals(c.get("expectedBucket").getAsInt(), ABTestify.bucketFromTop(top), hex);
        }
    }

    @Test
    void unsignedToDoubleMatchesBigInteger() {
        for (JsonElement e : vectors.getAsJsonArray("bucketCases")) {
            String hex = str(e.getAsJsonObject(), "top64Hex");
            // BigInteger.doubleValue rounds to nearest, ties to even.
            double expected = new java.math.BigInteger(hex, 16).doubleValue();
            assertEquals(expected, ABTestify.unsignedToDouble(Long.parseUnsignedLong(hex, 16)), hex);
        }
    }

    @Test
    void hashingCases() {
        JsonArray cases = vectors.getAsJsonArray("hashingCases");
        assertTrue(cases.size() >= 2000);
        int i = 0;
        for (JsonElement e : cases) {
            JsonObject c = e.getAsJsonObject();
            boolean legacy = c.get("legacyHashing").getAsBoolean();
            String experimentName = str(c, "experimentName");
            String uniqueId = str(c, "uniqueId");
            String key = legacy ? uniqueId : experimentName + ":" + uniqueId;
            assertEquals(c.get("expectedBucket").getAsInt(), ABTestify.bucketOf(key), "case " + i);

            Params params = Params.builder(experimentName, uniqueId)
                    .treatmentSplit(number(c.get("treatmentSplit")))
                    .exposure(number(c.get("exposure")))
                    .treatmentVariantName(str(c, "treatmentVariantName"))
                    .controlVariantName(str(c, "controlVariantName"))
                    .ignoreVariantName(str(c, "ignoreVariantName"))
                    .legacyHashing(legacy)
                    .build();
            assertEquals(
                    new Assignment(experimentName, uniqueId, str(c, "expectedVariant")),
                    ABTestify.getBucket(params),
                    "case " + i);
            i++;
        }
    }

    @Test
    void errorCases() {
        for (JsonElement e : vectors.getAsJsonArray("errorCases")) {
            JsonObject c = e.getAsJsonObject();
            Params params = Params.builder(str(c, "experimentName"), str(c, "uniqueId"))
                    .treatmentSplit(number(c.get("treatmentSplit")))
                    .exposure(number(c.get("exposure")))
                    .legacyHashing(c.get("legacyHashing").getAsBoolean())
                    .build();
            InvalidParamsException ex =
                    assertThrows(InvalidParamsException.class, () -> ABTestify.getBucket(params), str(c, "description"));
            assertEquals(str(c, "expectedErrorField"), ex.getField(), str(c, "description"));
            assertTrue(ex.getMessage().startsWith(ex.getField() + " "));
        }
    }

    @Test
    void defaults() {
        assertEquals(
                new Assignment("checkout-cta", "user-5", "treatment"),
                ABTestify.getBucket("checkout-cta", "user-5"));
        assertEquals(
                "control",
                ABTestify.getBucket(Params.builder("checkout-cta", "user-5").treatmentSplit(0).build())
                        .getResolvedVariant());
    }

    @Test
    void nullIdsAreRejected() {
        InvalidParamsException ex =
                assertThrows(InvalidParamsException.class, () -> ABTestify.getBucket("exp", null));
        assertEquals("uniqueId", ex.getField());
        ex = assertThrows(InvalidParamsException.class, () -> ABTestify.getBucket(null, "u"));
        assertEquals("experimentName", ex.getField());
        // Legacy hashing ignores the experiment name, as in TypeScript.
        Assignment legacy = ABTestify.getBucket(Params.builder(null, "u").legacyHashing(true).build());
        assertEquals(null, legacy.getExperimentName());
    }
}
