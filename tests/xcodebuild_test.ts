import { assertEquals } from "@std/assert";
import { buildArgs } from "../src/ios/xcodebuild.ts";

Deno.test("buildArgs constructs simulator xcodebuild command", () => {
  const args = buildArgs({
    container: { kind: "project", path: "/tmp/Axion.xcodeproj" },
    scheme: "Axion",
    destination: {
      name: "iPhone 17",
      udid: "SIM-UDID",
      state: "Shutdown",
      runtime: "iOS 18.0",
      runtimeVersion: "18.0",
      versionParts: [18, 0],
      isAvailable: true,
    },
    target: "sim",
    derivedData: ".newton/DerivedData",
  });

  assertEquals(args.includes("-project"), true);
  assertEquals(args.includes("/tmp/Axion.xcodeproj"), true);
  assertEquals(args.includes("platform=iOS Simulator,id=SIM-UDID"), true);
  assertEquals(args.includes("CODE_SIGN_IDENTITY=-"), true);
});
