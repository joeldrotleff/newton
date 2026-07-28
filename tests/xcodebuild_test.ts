import { assertEquals } from "@std/assert";
import { SimulatorDevice } from "../src/ios/simulator.ts";
import { AppleDevice } from "../src/ios/device.ts";
import { buildArgs, testArgs } from "../src/ios/xcodebuild.ts";

Deno.test("buildArgs constructs simulator xcodebuild command", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
  });

  assertEquals(args.includes("-project"), true);
  assertEquals(args.includes("/tmp/Axion.xcodeproj"), true);
  assertEquals(args.includes("platform=iOS Simulator,id=SIM-UDID"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), true);
  assertEquals(args.includes("-resolvePackageDependencies"), false);
});

Deno.test("buildArgs constructs watchOS simulator xcodebuild command", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Bartable.xcodeproj" },
    scheme: "Bartable",
    platform: "watchos",
    destination: watchSimulatorDevice,
    target: "sim",
  });

  assertEquals(args.includes("platform=watchOS Simulator,id=WATCH-SIM-UDID"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), true);
});

Deno.test("buildArgs constructs native macOS xcodebuild command", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Meh.xcodeproj" },
    scheme: "Meh",
    destination: { name: "My Mac" },
    target: "mac",
  });

  assertEquals(args.includes("platform=macOS"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), false);
});

Deno.test("buildArgs passes custom configuration names through to xcodebuild", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    configuration: "Debug Staging",
    destination: simulatorDevice,
    target: "sim",
  });

  assertEquals(args.includes("-configuration"), true);
  assertEquals(args.includes("Debug Staging"), true);
});

Deno.test("buildArgs targets a connected device with id= destination and no sim code-signing override", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: deviceDestination,
    target: "device",
  });

  assertEquals(args.includes("platform=iOS,id=HARDWARE-UDID"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), false);
});

Deno.test("buildArgs targets a connected Apple Watch", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Bartable.xcodeproj" },
    scheme: "Bartable",
    platform: "watchos",
    destination: watchDeviceDestination,
    target: "device",
  });

  assertEquals(args.includes("platform=watchOS,id=WATCH-HARDWARE-UDID"), true);
  assertEquals(args.includes("-allowProvisioningUpdates"), true);
});

Deno.test("buildArgs falls back to identifier when device hardwareUdid is missing", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: { name: "iPhone", identifier: "DEVICE-ID" },
    target: "device",
  });

  assertEquals(args.includes("platform=iOS,id=DEVICE-ID"), true);
});

Deno.test("buildArgs joins swiftFlags into a single OTHER_SWIFT_FLAGS setting", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
    swiftFlags: ["-D", "LOCALHOST_BACKEND", "-D", "DEBUG_EXTRA"],
  });

  assertEquals(args.includes("OTHER_SWIFT_FLAGS=-D LOCALHOST_BACKEND -D DEBUG_EXTRA"), true);
});

Deno.test("buildArgs omits OTHER_SWIFT_FLAGS when swiftFlags is empty or absent", () => {
  const empty = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
    swiftFlags: [],
  });
  const absent = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
  });

  assertEquals(empty.some((a) => a.startsWith("OTHER_SWIFT_FLAGS=")), false);
  assertEquals(absent.some((a) => a.startsWith("OTHER_SWIFT_FLAGS=")), false);
});

Deno.test("testArgs constructs simulator xcodebuild test command", () => {
  const args = testArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
  });

  assertEquals(args.includes("-project"), true);
  assertEquals(args.includes("/tmp/Axion.xcodeproj"), true);
  assertEquals(args.includes("platform=iOS Simulator,id=SIM-UDID"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), true);
  assertEquals(args.at(-1), "test");
});

Deno.test("buildArgs prepends 'clean' when action is 'clean build'", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: simulatorDevice,
    target: "sim",
    action: "clean build",
  });

  const cleanIndex = args.indexOf("clean");
  const buildIndex = args.indexOf("build");
  assertEquals(cleanIndex >= 0 && buildIndex > cleanIndex, true);
});

const simulatorDevice: SimulatorDevice = {
  platform: "ios",
  name: "iPhone 17",
  udid: "SIM-UDID",
  state: "Shutdown",
  runtime: "iOS 18.0",
  runtimeVersion: "18.0",
  versionParts: [18, 0],
  isAvailable: true,
};

const watchSimulatorDevice: SimulatorDevice = {
  platform: "watchos",
  name: "Apple Watch Series 11 (46mm)",
  udid: "WATCH-SIM-UDID",
  state: "Shutdown",
  runtime: "watchOS 26.5",
  runtimeVersion: "26.5",
  versionParts: [26, 5],
  isAvailable: true,
};

const deviceDestination: AppleDevice = {
  name: "My iPhone",
  identifier: "DEVICE-ID",
  hardwareUdid: "HARDWARE-UDID",
};

const watchDeviceDestination: AppleDevice = {
  name: "My Apple Watch",
  identifier: "WATCH-DEVICE-ID",
  hardwareUdid: "WATCH-HARDWARE-UDID",
  platform: "watchOS",
};
