package io.github.pranav2012.abtestify;

import java.util.Objects;

/** The variant a user is assigned to. Immutable. */
public final class Assignment {
    private final String experimentName;
    private final String uniqueId;
    private final String resolvedVariant;

    /** Creates an assignment; mostly useful in tests of code that consumes assignments. */
    public Assignment(String experimentName, String uniqueId, String resolvedVariant) {
        this.experimentName = experimentName;
        this.uniqueId = uniqueId;
        this.resolvedVariant = resolvedVariant;
    }

    /** The experiment name that was passed in; may be null only with legacy hashing. */
    public String getExperimentName() {
        return experimentName;
    }

    /** The unique ID that was passed in. */
    public String getUniqueId() {
        return uniqueId;
    }

    /** The treatment, control or ignore variant name. */
    public String getResolvedVariant() {
        return resolvedVariant;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Assignment)) {
            return false;
        }
        Assignment other = (Assignment) o;
        return Objects.equals(experimentName, other.experimentName)
                && Objects.equals(uniqueId, other.uniqueId)
                && Objects.equals(resolvedVariant, other.resolvedVariant);
    }

    @Override
    public int hashCode() {
        return Objects.hash(experimentName, uniqueId, resolvedVariant);
    }

    @Override
    public String toString() {
        return "Assignment{experimentName="
                + experimentName
                + ", uniqueId="
                + uniqueId
                + ", resolvedVariant="
                + resolvedVariant
                + "}";
    }
}
