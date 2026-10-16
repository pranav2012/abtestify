import Foundation
import XCTest

@testable import ABTestify

/// Runs the shared test vectors in test-vectors/vectors.json.
final class VectorsTests: XCTestCase {
    /// A JSON number, or one of "NaN", "Infinity", "-Infinity".
    struct Number: Decodable {
        let value: Double

        init(from decoder: Decoder) throws {
            let container = try decoder.singleValueContainer()
            if let text = try? container.decode(String.self) {
                switch text {
                case "NaN": value = .nan
                case "Infinity": value = .infinity
                case "-Infinity": value = -.infinity
                default:
                    throw DecodingError.dataCorruptedError(
                        in: container, debugDescription: "unknown special number \(text)")
                }
            } else {
                value = try container.decode(Double.self)
            }
        }
    }

    struct BucketCase: Decodable {
        let top64Hex: String
        let expectedBucket: Int
    }

    struct HashingCase: Decodable {
        let experimentName: String
        let uniqueId: String
        let treatmentSplit: Double
        let exposure: Double
        let treatmentVariantName: String
        let controlVariantName: String
        let ignoreVariantName: String
        let legacyHashing: Bool
        let expectedBucket: Int
        let expectedVariant: String
    }

    struct ErrorCase: Decodable {
        let description: String
        let experimentName: String
        let uniqueId: String
        let treatmentSplit: Number
        let exposure: Number
        let legacyHashing: Bool
        let expectedErrorField: String
    }

    struct Vectors: Decodable {
        let bucketCases: [BucketCase]
        let hashingCases: [HashingCase]
        let errorCases: [ErrorCase]
    }

    static let vectors: Vectors = {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // ABTestifyTests
            .deletingLastPathComponent()  // Tests
            .deletingLastPathComponent()  // swift
            .deletingLastPathComponent()  // repository root
            .appendingPathComponent("test-vectors/vectors.json")
        do {
            return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: url))
        } catch {
            fatalError("loading \(url.path): \(error)")
        }
    }()

    func testBucketCases() {
        let cases = Self.vectors.bucketCases
        XCTAssertGreaterThan(cases.count, 1000)
        for c in cases {
            guard let top = UInt64(c.top64Hex, radix: 16) else {
                return XCTFail("bad hex \(c.top64Hex)")
            }
            XCTAssertEqual(ABTestify.bucketFromTop(top), c.expectedBucket, c.top64Hex)
        }
    }

    func testHashingCases() throws {
        let cases = Self.vectors.hashingCases
        XCTAssertGreaterThanOrEqual(cases.count, 2000)
        for (i, c) in cases.enumerated() {
            let key = c.legacyHashing ? c.uniqueId : c.experimentName + ":" + c.uniqueId
            XCTAssertEqual(ABTestify.bucketOf(key), c.expectedBucket, "case \(i)")
            let result = try ABTestify.bucket(
                experimentName: c.experimentName,
                uniqueId: c.uniqueId,
                treatmentSplit: c.treatmentSplit,
                exposure: c.exposure,
                treatmentVariantName: c.treatmentVariantName,
                controlVariantName: c.controlVariantName,
                ignoreVariantName: c.ignoreVariantName,
                legacyHashing: c.legacyHashing
            )
            // Compare UTF-8 bytes: Swift's String == treats canonically
            // equivalent strings (e.g. NFC and NFD) as equal.
            XCTAssertEqual(Array(result.resolvedVariant.utf8), Array(c.expectedVariant.utf8), "case \(i)")
            XCTAssertEqual(Array(result.experimentName.utf8), Array(c.experimentName.utf8), "case \(i)")
            XCTAssertEqual(Array(result.uniqueId.utf8), Array(c.uniqueId.utf8), "case \(i)")
        }
    }

    func testErrorCases() {
        for c in Self.vectors.errorCases {
            XCTAssertThrowsError(
                try ABTestify.bucket(
                    experimentName: c.experimentName,
                    uniqueId: c.uniqueId,
                    treatmentSplit: c.treatmentSplit.value,
                    exposure: c.exposure.value,
                    legacyHashing: c.legacyHashing
                ),
                c.description
            ) { error in
                XCTAssertEqual((error as? ABTestifyError)?.field, c.expectedErrorField, c.description)
            }
        }
    }

    func testDefaults() throws {
        XCTAssertEqual(
            try ABTestify.bucket(experimentName: "checkout-cta", uniqueId: "user-5"),
            Assignment(experimentName: "checkout-cta", uniqueId: "user-5", resolvedVariant: "treatment")
        )
        XCTAssertEqual(
            try ABTestify.bucket(experimentName: "checkout-cta", uniqueId: "user-5", treatmentSplit: 0)
                .resolvedVariant,
            "control"
        )
    }

    func testSHA256() {
        func hex(_ s: String) -> String {
            SHA256.hash(Array(s.utf8)).map { String(format: "%02x", $0) }.joined()
        }
        XCTAssertEqual(hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        XCTAssertEqual(hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        XCTAssertEqual(
            hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq"),
            "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1"
        )
    }
}
