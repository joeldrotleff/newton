import { assertEquals, assertThrows } from "@std/assert";
import {
  assertCompatibleSelection,
  compareSimulatorPreference,
  isAppStoreCompatible,
  parseVersion,
  selectSimulator,
  selectSimulatorCreation,
  selectSimulatorForDeletion,
  SimulatorDevice,
  SimulatorDeviceType,
  SimulatorRuntime,
} from "../src/ios/simulator.ts";

function device(
  name: string,
  runtimeVersion = "18.0",
  platform: "ios" | "watchos" = "ios",
): SimulatorDevice {
  const runtimeName = platform === "watchos" ? "watchOS" : "iOS";
  return {
    platform,
    name,
    udid: name,
    state: "Shutdown",
    runtime: `com.apple.CoreSimulator.SimRuntime.${runtimeName}-${
      runtimeVersion.replaceAll(".", "-")
    }`,
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

Deno.test("selectSimulator chooses a watchOS simulator from a mixed fleet", () => {
  const watchFleet = [
    ...fleet,
    device("Apple Watch Ultra 3 (49mm)", "26.5", "watchos"),
    device("Apple Watch Series 11 (46mm)", "26.5", "watchos"),
    device("Apple Watch Series 11 (42mm)", "26.5", "watchos"),
  ];

  const chosen = selectSimulator(watchFleet, { platform: "watchos" });

  assertEquals(chosen.name, "Apple Watch Series 11 (46mm)");
});

Deno.test("selectSimulator pins exactly by udid and sim", () => {
  assertEquals(selectSimulator(fleet, { udid: "iPad mini (A17 Pro)" }).name, "iPad mini (A17 Pro)");
  assertEquals(selectSimulator(fleet, { sim: "iPhone 16" }).name, "iPhone 16");
});

Deno.test("assertCompatibleSelection rejects iOS-only filters for watchOS", () => {
  assertThrows(
    () => assertCompatibleSelection({ platform: "watchos", idiom: "iphone" }),
    Error,
    "only apply to iOS simulators",
  );
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

const iphone17: SimulatorDeviceType = {
  name: "iPhone 17",
  identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17",
  productFamily: "iPhone",
};
const iphone17Pro: SimulatorDeviceType = {
  name: "iPhone 17 Pro",
  identifier: "com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro",
  productFamily: "iPhone",
};

function runtime(
  version: string,
  supportedDeviceTypes: SimulatorDeviceType[],
): SimulatorRuntime {
  return {
    name: `iOS ${version}`,
    identifier: `com.apple.CoreSimulator.SimRuntime.iOS-${version.replaceAll(".", "-")}`,
    version,
    isAvailable: true,
    supportedDeviceTypes,
  };
}

Deno.test("selectSimulatorCreation defaults to iPhone 17 on the newest compatible iOS runtime", () => {
  const unavailable = { ...runtime("27.0", [iphone17]), isAvailable: false };
  const watch = {
    ...runtime("99.0", [iphone17]),
    identifier: "com.apple.CoreSimulator.SimRuntime.watchOS-99-0",
  };
  const selection = selectSimulatorCreation([
    runtime("26.0", [iphone17]),
    runtime("26.2", [iphone17, iphone17Pro]),
    unavailable,
    watch,
  ]);

  assertEquals(selection.deviceType, iphone17);
  assertEquals(selection.runtime.version, "26.2");
});

Deno.test("selectSimulatorCreation accepts exact device type and runtime identifiers", () => {
  const ios26 = runtime("26.0", [iphone17, iphone17Pro]);
  const selection = selectSimulatorCreation([ios26], {
    deviceType: iphone17Pro.identifier,
    runtime: ios26.identifier,
  });

  assertEquals(selection, { deviceType: iphone17Pro, runtime: ios26 });
});

Deno.test("selectSimulatorCreation rejects an incompatible requested runtime", () => {
  assertThrows(
    () =>
      selectSimulatorCreation([
        runtime("18.4", [iphone17]),
        runtime("26.0", [iphone17Pro]),
      ], {
        deviceType: "iPhone 17 Pro",
        runtime: "18.4",
      }),
    Error,
    "No iOS runtime compatible with iPhone 17 Pro",
  );
});

Deno.test("selectSimulatorForDeletion requires an exact unambiguous simulator match", () => {
  const first = { ...device("quest-123"), udid: "FIRST" };
  const second = { ...device("quest-123", "18.1"), udid: "SECOND" };

  assertEquals(selectSimulatorForDeletion([first, second], "SECOND"), second);
  assertThrows(
    () => selectSimulatorForDeletion([first, second], "quest-123"),
    Error,
    "Multiple iOS simulators",
  );
  assertThrows(
    () => selectSimulatorForDeletion([first], "missing"),
    Error,
    "No iOS simulator found",
  );
});
