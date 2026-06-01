import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCompatibleSelection,
  compareSimulatorPreference,
  isAppStoreCompatible,
  parseVersion,
  selectSimulator,
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

const fleet: SimulatorDevice[] = [
  device("iPhone 16"),
  device("iPhone 16 Pro Max"),
  device("iPad Pro 13-inch (M4)"),
  device("iPad mini (A17 Pro)"),
];

Deno.test("selectSimulator uses preferred simulator when no selection flags are given", () => {
  const chosen = selectSimulator(fleet, { preferred: "iPhone 16 Pro Max" });
  assertEquals(chosen.name, "iPhone 16 Pro Max");
});

Deno.test("selectSimulator ignores preferred when --idiom is passed and ranks by idiom", () => {
  const chosen = selectSimulator(fleet, { idiom: "ipad", preferred: "iPhone 16 Pro Max" });
  assertEquals(chosen.name, "iPad Pro 13-inch (M4)");
});

Deno.test("selectSimulator falls back to ranking when preferred no longer exists", () => {
  const chosen = selectSimulator(fleet, { preferred: "iPhone 99 (deleted)" });
  assertEquals(chosen.name, "iPhone 16");
});

Deno.test("selectSimulator pins exactly by udid and sim", () => {
  assertEquals(selectSimulator(fleet, { udid: "iPad mini (A17 Pro)" }).name, "iPad mini (A17 Pro)");
  assertEquals(selectSimulator(fleet, { sim: "iPhone 16" }).name, "iPhone 16");
});

Deno.test("assertCompatibleSelection rejects --sim combined with --udid", () => {
  assertThrows(
    () => assertCompatibleSelection({ sim: "iPhone 16", udid: "ABC" }),
    Error,
    "only one of --sim or --udid",
  );
});

Deno.test("assertCompatibleSelection rejects a pin combined with an idiom filter", () => {
  assertThrows(
    () => assertCompatibleSelection({ sim: "iPhone 16", idiom: "ipad" }),
    Error,
    "can't be combined with --idiom",
  );
  assertThrows(
    () => assertCompatibleSelection({ udid: "ABC", appStore: "ipad" }),
    Error,
    "can't be combined with --app-store",
  );
});

Deno.test("assertCompatibleSelection rejects conflicting --idiom and --app-store", () => {
  assertThrows(
    () => assertCompatibleSelection({ idiom: "iphone", appStore: "ipad" }),
    Error,
    "conflicts with --app-store",
  );
});

Deno.test("assertCompatibleSelection allows matching --idiom and --app-store", () => {
  assertCompatibleSelection({ idiom: "ipad", appStore: "ipad" });
});
