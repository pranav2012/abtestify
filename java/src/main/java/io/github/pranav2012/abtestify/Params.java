package io.github.pranav2012.abtestify;

import java.util.Objects;

/** Immutable input for {@link ABTestify#getBucket(Params)}. Build one with {@link #builder}. */
public final class Params {
    /** Default treatment percentage. */
    public static final double DEFAULT_TREATMENT_SPLIT = 50;
    /** Default exposure percentage. */
    public static final double DEFAULT_EXPOSURE = 100;
    /** Default treatment variant name. */
    public static final String DEFAULT_TREATMENT_VARIANT_NAME = "treatment";
    /** Default control variant name. */
    public static final String DEFAULT_CONTROL_VARIANT_NAME = "control";
    /** Default name for users outside the exposure. */
    public static final String DEFAULT_IGNORE_VARIANT_NAME = "ignore";

    private final String experimentName;
    private final String uniqueId;
    private final double treatmentSplit;
    private final double exposure;
    private final String treatmentVariantName;
    private final String controlVariantName;
    private final String ignoreVariantName;
    private final boolean legacyHashing;

    private Params(Builder b) {
        this.experimentName = b.experimentName;
        this.uniqueId = b.uniqueId;
        this.treatmentSplit = b.treatmentSplit;
        this.exposure = b.exposure;
        this.treatmentVariantName = b.treatmentVariantName;
        this.controlVariantName = b.controlVariantName;
        this.ignoreVariantName = b.ignoreVariantName;
        this.legacyHashing = b.legacyHashing;
    }

    /**
     * Starts building params for {@code uniqueId} in {@code experimentName}. Validation happens in
     * {@link ABTestify#getBucket(Params)}.
     */
    public static Builder builder(String experimentName, String uniqueId) {
        return new Builder(experimentName, uniqueId);
    }

    /** Name of the experiment; part of the hash. */
    public String getExperimentName() {
        return experimentName;
    }

    /** Stable identifier for the user. */
    public String getUniqueId() {
        return uniqueId;
    }

    /** Percentage of exposed users who get the treatment, 0 to 100. */
    public double getTreatmentSplit() {
        return treatmentSplit;
    }

    /** Percentage of all users in the experiment, 0 to 100. */
    public double getExposure() {
        return exposure;
    }

    /** Variant name for treatment users. */
    public String getTreatmentVariantName() {
        return treatmentVariantName;
    }

    /** Variant name for control users. */
    public String getControlVariantName() {
        return controlVariantName;
    }

    /** Variant name for users outside the exposure. */
    public String getIgnoreVariantName() {
        return ignoreVariantName;
    }

    /** Whether to bucket by the unique ID alone, as abtestify 0.1.x did. */
    public boolean isLegacyHashing() {
        return legacyHashing;
    }

    /** Builder for {@link Params}. Every setter is optional. */
    public static final class Builder {
        private final String experimentName;
        private final String uniqueId;
        private double treatmentSplit = DEFAULT_TREATMENT_SPLIT;
        private double exposure = DEFAULT_EXPOSURE;
        private String treatmentVariantName = DEFAULT_TREATMENT_VARIANT_NAME;
        private String controlVariantName = DEFAULT_CONTROL_VARIANT_NAME;
        private String ignoreVariantName = DEFAULT_IGNORE_VARIANT_NAME;
        private boolean legacyHashing;

        private Builder(String experimentName, String uniqueId) {
            this.experimentName = experimentName;
            this.uniqueId = uniqueId;
        }

        /** Percentage of exposed users who get the treatment, 0 to 100. Default 50. */
        public Builder treatmentSplit(double percent) {
            this.treatmentSplit = percent;
            return this;
        }

        /** Percentage of all users in the experiment, 0 to 100. Default 100. */
        public Builder exposure(double percent) {
            this.exposure = percent;
            return this;
        }

        /** Variant name for treatment users. Default "treatment". */
        public Builder treatmentVariantName(String name) {
            this.treatmentVariantName = Objects.requireNonNull(name, "treatmentVariantName");
            return this;
        }

        /** Variant name for control users. Default "control". */
        public Builder controlVariantName(String name) {
            this.controlVariantName = Objects.requireNonNull(name, "controlVariantName");
            return this;
        }

        /** Variant name for users outside the exposure. Default "ignore". */
        public Builder ignoreVariantName(String name) {
            this.ignoreVariantName = Objects.requireNonNull(name, "ignoreVariantName");
            return this;
        }

        /** Bucket by the unique ID alone, as abtestify 0.1.x did. Default false. */
        public Builder legacyHashing(boolean enabled) {
            this.legacyHashing = enabled;
            return this;
        }

        /** Builds the params. */
        public Params build() {
            return new Params(this);
        }
    }
}
