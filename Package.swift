// swift-tools-version:5.5
// The Swift port lives in swift/; SwiftPM needs this manifest at the repository
// root so the package resolves from the repo's plain semver release tags.
import PackageDescription

let package = Package(
    name: "ABTestify",
    products: [
        .library(name: "ABTestify", targets: ["ABTestify"]),
    ],
    targets: [
        .target(name: "ABTestify", path: "swift/Sources/ABTestify"),
        .testTarget(
            name: "ABTestifyTests",
            dependencies: ["ABTestify"],
            path: "swift/Tests/ABTestifyTests"
        ),
    ]
)
