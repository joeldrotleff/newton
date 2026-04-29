import { assertEquals } from "@std/assert";
import {
  compareSimulatorPreference,
  isAppStoreCompatible,
  parseVersion,
  SimulatorDevice,
} from "../src/ios/simulator.ts";

function device(name: string, runtimeVersion = "18.0"): SimulatorDevice {
  return {
    name,
    udid: name,
    state: "Shutdown",
    runtime: `com.apple.CoreSimulator.SimRuntime.iOS-${runtimeVersion.replaceAll(".", "-")}`,
    runtimeVersion,
    versionParts: parseVersion(runtimeVersion),
    isAvailable: true,
  };
}

Deno.test("parseVersion extracts numeric components", () => {
  assertEquals(parseVersion("18.2"), [18, 2]);
});

Deno.test("iPhone ranking prefers newest runtime, then base model before Pro Max", () => {
  const sorted = [
    device("iPhone 17 Pro Max", "18.0"),
    device("iPhone 16", "18.2"),
    device("iPhone 17", "18.0"),
  ].toSorted(compareSimulatorPreference("iphone"));

  assertEquals(sorted.map((item) => item.name), ["iPhone 16", "iPhone 17", "iPhone 17 Pro Max"]);
});

Deno.test("marks pragmatic App Store screenshot devices", () => {
  assertEquals(isAppStoreCompatible(device("iPhone 16 Pro Max"), "iphone"), true);
  assertEquals(isAppStoreCompatible(device("iPhone 16"), "iphone"), false);
  assertEquals(isAppStoreCompatible(device("iPad Pro 13-inch (M4)"), "ipad"), true);
});
