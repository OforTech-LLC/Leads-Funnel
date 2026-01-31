// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "kanjona-lead-capture",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "LeadCaptureAPI", targets: ["LeadCaptureAPI"])
    ],
    dependencies: [
        // Vapor web framework
        .package(url: "https://github.com/vapor/vapor.git", from: "4.90.0"),

        // Soto AWS SDK
        .package(url: "https://github.com/soto-project/soto.git", from: "6.8.0"),

        // Crypto
        .package(url: "https://github.com/apple/swift-crypto.git", from: "3.0.0"),

    ],
    targets: [
        // Main API target
        .executableTarget(
            name: "LeadCaptureAPI",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
                .product(name: "SotoDynamoDB", package: "soto"),
                .product(name: "SotoEventBridge", package: "soto"),
                .product(name: "SotoSSM", package: "soto"),
                .product(name: "Crypto", package: "swift-crypto"),
                "Shared"
            ],
            path: "Sources/LeadCaptureAPI"
        ),

        // Shared library
        .target(
            name: "Shared",
            path: "Sources/Shared"
        ),

        // Tests using Swift Testing
        .testTarget(
            name: "LeadCaptureAPITests",
            dependencies: [
                "LeadCaptureAPI",
                "Shared",
                .product(name: "XCTVapor", package: "vapor"),
            ],
            path: "Tests/LeadCaptureAPITests"
        ),
        .testTarget(
            name: "SharedTests",
            dependencies: [
                "Shared",
            ],
            path: "Tests/SharedTests"
        )
    ],
    swiftLanguageModes: [.v5]
)
