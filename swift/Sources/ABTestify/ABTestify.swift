/// Deterministic A/B test bucketing.
///
/// The bucket comes from SHA-256 of `experimentName:uniqueId`, so a user always
/// gets the same variant within an experiment and independent variants across
/// experiments. Raising `exposure` only adds users; it never moves anyone
/// between variants.
///
/// Assignments are byte-for-byte identical to the abtestify npm package and its
/// Go, Rust, Python and Java/Kotlin ports; shared test vectors enforce it.
///
/// ```swift
/// let assignment = try ABTestify.bucket(experimentName: "checkout-cta", uniqueId: "user123")
/// if assignment.resolvedVariant == "treatment" { /* ... */ }
/// ```
public enum ABTestify {
    /// Number of buckets users are spread across.
    public static let buckets = 10_000

    /// Assigns `uniqueId` to a variant of `experimentName`.
    ///
    /// - Parameters:
    ///   - experimentName: Name of the experiment; part of the hash. Required unless `legacyHashing`.
    ///   - uniqueId: Stable identifier for the user. Required.
    ///   - treatmentSplit: Percentage of exposed users who get the treatment, 0 to 100.
    ///   - exposure: Percentage of all users in the experiment, 0 to 100.
    ///   - treatmentVariantName: Variant name for treatment users.
    ///   - controlVariantName: Variant name for control users.
    ///   - ignoreVariantName: Variant name for users outside the exposure.
    ///   - legacyHashing: Bucket by `uniqueId` alone, as abtestify 0.1.x did.
    /// - Throws: `ABTestifyError` when a percentage is not a finite number from 0
    ///   to 100, `uniqueId` is empty, or `experimentName` is empty without
    ///   `legacyHashing`, checked in that order.
    public static func bucket(
        experimentName: String,
        uniqueId: String,
        treatmentSplit: Double = 50,
        exposure: Double = 100,
        treatmentVariantName: String = "treatment",
        controlVariantName: String = "control",
        ignoreVariantName: String = "ignore",
        legacyHashing: Bool = false
    ) throws -> Assignment {
        guard isPercentage(treatmentSplit) else {
            throw ABTestifyError.invalidTreatmentSplit(treatmentSplit)
        }
        guard isPercentage(exposure) else { throw ABTestifyError.invalidExposure(exposure) }
        guard !uniqueId.isEmpty else { throw ABTestifyError.emptyUniqueId }
        guard legacyHashing || !experimentName.isEmpty else {
            throw ABTestifyError.emptyExperimentName
        }

        let bucket = bucketOf(legacyHashing ? uniqueId : experimentName + ":" + uniqueId)

        let variant: String
        if Double(bucket) / 100 >= exposure {
            variant = ignoreVariantName
        } else if Double(bucket % 100) < treatmentSplit {
            variant = treatmentVariantName
        } else {
            variant = controlVariantName
        }
        return Assignment(experimentName: experimentName, uniqueId: uniqueId, resolvedVariant: variant)
    }

    /// Maps a key to a bucket from the first 8 bytes of the SHA-256 of its UTF-8 bytes.
    static func bucketOf(_ key: String) -> Int {
        let digest = SHA256.hash(Array(key.utf8))
        var top: UInt64 = 0
        for byte in digest[0..<8] {
            top = (top << 8) | UInt64(byte)
        }
        return bucketFromTop(top)
    }

    /// Maps a 64-bit value to 0...10000 exactly as JavaScript's
    /// `Math.floor(Number(top) / Number(2n ** 64n - 1n) * 10000)` does.
    /// `Double(UInt64)` rounds to nearest, ties to even, like `Number()`, and
    /// `Number(2^64 - 1)` is exactly 2^64.
    static func bucketFromTop(_ top: UInt64) -> Int {
        Int((Double(top) / 18_446_744_073_709_551_616.0 * Double(buckets)).rounded(.down))
    }

    private static func isPercentage(_ value: Double) -> Bool {
        value.isFinite && value >= 0 && value <= 100
    }
}

/// The variant a user is assigned to.
public struct Assignment: Hashable, Sendable {
    /// The experiment name that was passed in.
    public let experimentName: String
    /// The unique ID that was passed in.
    public let uniqueId: String
    /// The treatment, control or ignore variant name.
    public let resolvedVariant: String

    /// Creates an assignment; mostly useful in tests of code that consumes assignments.
    public init(experimentName: String, uniqueId: String, resolvedVariant: String) {
        self.experimentName = experimentName
        self.uniqueId = uniqueId
        self.resolvedVariant = resolvedVariant
    }
}

/// Invalid input to `ABTestify.bucket`.
public enum ABTestifyError: Error, Equatable, Sendable, CustomStringConvertible {
    /// `treatmentSplit` is not a finite number from 0 to 100.
    case invalidTreatmentSplit(Double)
    /// `exposure` is not a finite number from 0 to 100.
    case invalidExposure(Double)
    /// `uniqueId` is empty.
    case emptyUniqueId
    /// `experimentName` is empty and `legacyHashing` is off.
    case emptyExperimentName

    /// The offending parameter: treatmentSplit, exposure, uniqueId or experimentName.
    public var field: String {
        switch self {
        case .invalidTreatmentSplit: return "treatmentSplit"
        case .invalidExposure: return "exposure"
        case .emptyUniqueId: return "uniqueId"
        case .emptyExperimentName: return "experimentName"
        }
    }

    public var description: String {
        switch self {
        case .invalidTreatmentSplit:
            return "treatmentSplit must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the treatment group."
        case .invalidExposure:
            return "exposure must be a number between 0 and 100 as it represents the percentage of users who will be bucketed into the experiment."
        case .emptyUniqueId:
            return "uniqueId must be a non-empty string."
        case .emptyExperimentName:
            return "experimentName must be a non-empty string."
        }
    }
}
