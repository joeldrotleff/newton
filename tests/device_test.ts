import { assertEquals } from "@std/assert";
import { parseDevices } from "../src/ios/device.ts";

for (const platform of ["iOS", "watchOS"]) {
  for (const format of ["legacy", "current"]) {
    Deno.test(`parseDevices excludes ${platform} simulators with ${format} reality fields`, () => {
      const devices = ["physical", "simulated"].map((reality) => ({
        identifier: reality,
        deviceProperties: { name: reality },
        hardwareProperties: {
          platform,
          ...(format === "legacy" ? { reality } : {}),
        },
        ...(format === "current" ? { properties: { hardware: { reality } } } : {}),
        connectionProperties: {
          transportType: reality === "simulated" ? "sameMachine" : "localNetwork",
        },
      }));
      assertEquals(parseDevices({ result: { devices } }).map((device) => device.identifier), [
        "physical",
      ]);
    });
  }
}

Deno.test("parseDevices excludes paired devices that are not reachable", () => {
  const devices = [
    {
      identifier: "reachable",
      deviceProperties: { name: "iPhone" },
      hardwareProperties: { platform: "iOS", reality: "physical" },
      connectionProperties: { transportType: "localNetwork", tunnelState: "disconnected" },
    },
    {
      identifier: "unreachable",
      deviceProperties: { name: "Coworker iPhone" },
      hardwareProperties: { platform: "iOS", reality: "physical" },
      connectionProperties: { tunnelState: "unavailable" },
    },
  ];
  assertEquals(parseDevices({ result: { devices } }).map((device) => device.identifier), [
    "reachable",
  ]);
});

Deno.test("parseDevices keeps older physical devices without a reality field", () => {
  const devices = ["wired", "localNetwork"].map((transportType) => ({
    identifier: transportType,
    deviceProperties: { name: "iPhone" },
    hardwareProperties: { platform: "iOS", udid: `${transportType}-udid` },
    connectionProperties: { transportType },
  }));
  assertEquals(
    parseDevices({ devices }),
    devices.map((device) => ({
      name: "iPhone",
      identifier: device.identifier,
      hardwareUdid: device.hardwareProperties.udid,
      platform: "iOS",
      connectionState: device.connectionProperties.transportType,
    })),
  );
});
