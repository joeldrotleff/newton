export type ApplePlatform = "ios" | "watchos" | "macos";
export type DevicePlatform = Exclude<ApplePlatform, "macos">;

export function platformDisplayName(platform: ApplePlatform): string {
  switch (platform) {
    case "ios":
      return "iOS";
    case "watchos":
      return "watchOS";
    case "macos":
      return "macOS";
  }
}

export function genericBuildDestination(platform: ApplePlatform): string {
  switch (platform) {
    case "ios":
      return "generic/platform=iOS Simulator";
    case "watchos":
      return "generic/platform=watchOS Simulator";
    case "macos":
      return "generic/platform=macOS";
  }
}

export function simulatorBuildDestination(platform: DevicePlatform, udid: string): string {
  return `platform=${platform === "watchos" ? "watchOS" : "iOS"} Simulator,id=${udid}`;
}

export function deviceBuildDestination(platform: DevicePlatform, id: string): string {
  return `platform=${platform === "watchos" ? "watchOS" : "iOS"},id=${id}`;
}

export function buildProductsSuffix(
  platform: ApplePlatform,
  target: "sim" | "device" | "mac",
): string {
  if (target === "mac") return "";
  if (platform === "watchos") return target === "sim" ? "watchsimulator" : "watchos";
  return target === "sim" ? "iphonesimulator" : "iphoneos";
}
