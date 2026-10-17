package io.github.pranav2012.abtestify;

/** Thrown by {@link ABTestify#getBucket(Params)} for invalid input. */
public final class InvalidParamsException extends IllegalArgumentException {
    private static final long serialVersionUID = 1L;

    private final String field;

    InvalidParamsException(String field, String message) {
        super(message);
        this.field = field;
    }

    /** The offending parameter: treatmentSplit, exposure, uniqueId or experimentName. */
    public String getField() {
        return field;
    }
}
