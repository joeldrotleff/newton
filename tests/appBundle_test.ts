import { assertEquals, assertRejects } from "@std/assert";
import { locateBuiltApp } from "../src/ios/appBundle.ts";
import { BuildOptions } from "../src/ios/xcodebuild.ts";

Deno.test("locateBuiltApp calculates simulator app path from config", async () => {
  await using fixture = await appFixture();
  const appPath =
    `${fixture.derivedData}/Build/Products/Debug Staging-iphonesimulator/Silo - Staging.app`;
  await createApp(appPath);

  assertEquals(
    await locateBuiltApp(buildOptions(fixture, {
      configuration: "Debug Staging",
      appName: "Silo - Staging",
      target: "sim",
    })),
    appPath,
  );
});

Deno.test("locateBuiltApp calculates device app path from config", async () => {
  await using fixture = await appFixture();
  const appPath = `${fixture.derivedData}/Build/Products/Debug Staging-iphoneos/Silo - Staging.app`;
  await createApp(appPath);

  assertEquals(
    await locateBuiltApp(buildOptions(fixture, {
      configuration: "Debug Staging",
      appName: "Silo - Staging",
      target: "device",
    })),
    appPath,
  );
});

Deno.test("locateBuiltApp requires appName from newton config", async () => {
  await using fixture = await appFixture();

  await assertRejects(
    () => locateBuiltApp(buildOptions(fixture, { target: "sim" })),
    Error,
    "Missing appName in newton.json",
  );
});

async function appFixture() {
  const root = await Deno.makeTempDir();
  return {
    root,
    derivedData: `${root}/DerivedData`,
    async [Symbol.asyncDispose]() {
      await Deno.remove(root, { recursive: true });
    },
  };
}

async function createApp(path: string) {
  await Deno.mkdir(path, { recursive: true });
  await Deno.writeTextFile(`${path}/Info.plist`, "plist");
}

function buildOptions(
  fixture: Awaited<ReturnType<typeof appFixture>>,
  options: Pick<BuildOptions, "configuration" | "appName" | "target">,
): BuildOptions {
  const target = options.target ?? "sim";
  return {
    container: { kind: "project", path: `${fixture.root}/App.xcodeproj` },
    scheme: "Silo Staging",
    configuration: options.configuration,
    appName: options.appName,
    destination: target === "device" ? { name: "iPhone", identifier: "DEVICE-UDID" } : {
      name: "iPhone 17",
      udid: "SIM-UDID",
      state: "Booted",
      runtime: "iOS 18.0",
      runtimeVersion: "18.0",
      versionParts: [18, 0],
      isAvailable: true,
    },
    target,
    derivedData: fixture.derivedData,
  };
}
