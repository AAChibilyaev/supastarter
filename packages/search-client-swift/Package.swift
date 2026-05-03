// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "aacsearch",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .visionOS(.v1),
    ],
    products: [
        .library(
            name: "Aacsearch",
            targets: ["Aacsearch"]
        ),
    ],
    targets: [
        .target(
            name: "Aacsearch",
            path: "Sources/Aacsearch",
            linkerSettings: []
        ),
    ]
)
