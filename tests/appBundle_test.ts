import { assertEquals, assertRejects } from "@std/assert";
import { locateBuiltApp } from "../src/ios/appBundle.ts";
import { BuildOptions } from "../src/ios/xcodebuild.ts";
import { defaultDerivedDataPath } from "../src/ios/project.ts";

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

Deno.test("locateBuiltApp calculates watchOS simulator app path", async () => {
  await using fixture = await appFixture();
  const appPath = `${fixture.derivedData}/Build/Products/Debug-watchsimulator/Bartable.app`;
  await createApp(appPath);

  assertEquals(
    await locateBuiltApp(buildOptions(fixture, {
      configuration: "Debug",
      appName: "Bartable",
      platform: "watchos",
      target: "sim",
    })),
    appPath,
  );
});

Deno.test("locateBuiltApp calculates watchOS device app path", async () => {
  await using fixture = await appFixture();
  const appPath = `${fixture.derivedData}/Build/Products/Debug-watchos/Bartable.app`;
  await createApp(appPath);

  assertEquals(
    await locateBuiltApp(buildOptions(fixture, {
      configuration: "Debug",
      appName: "Bartable",
      platform: "watchos",
      target: "device",
    })),
    appPath,
  );
});

Deno.test("locateBuiltApp calculates macOS app path from config", async () => {
  await using fixture = await appFixture();
  const appPath = `${fixture.derivedData}/Build/Products/Debug/Meh.app`;
  await createApp(appPath);

  assertEquals(
    await locateBuiltApp(buildOptions(fixture, {
      configuration: "Debug",
      appName: "Meh",
      target: "mac",
    })),
    appPath,
  );
});

Deno.test("locateBuiltApp requires appName from newton config", async () => {
  await using fixture = await appFixture();

  await assertRejects(
    () => locateBuiltApp(buildOptions(fixture, { target: "sim" })),
    Error,
    "No newton.json found",
  );
});

interface AppFixture {
  root: string;
  derivedData: string;
  originalCwd: string;
  [Symbol.asyncDispose](): Promise<void>;
}

async function appFixture(): Promise<AppFixture> {
  const root = await Deno.makeTempDir();
  const originalCwd = Deno.cwd();
  Deno.chdir(root);
  return {
    root,
    derivedData: defaultDerivedDataPath(Deno.cwd()),
    originalCwd,
    async [Symbol.asyncDispose]() {
      Deno.chdir(originalCwd);
      await Deno.remove(root, { recursive: true });
    },
  };
}

async function createApp(path: string) {
  await Deno.mkdir(path, { recursive: true });
  await Deno.writeTextFile(`${path}/Info.plist`, "plist");
}

function buildOptions(
  fixture: AppFixture,
  options: Pick<BuildOptions, "configuration" | "appName" | "platform" | "target">,
): BuildOptions {
  const target = options.target ?? "sim";
  return {
    container: { kind: "project", path: `${fixture.root}/App.xcodeproj` },
    scheme: "Silo Staging",
    configuration: options.configuration,
    appName: options.appName,
    platform: options.platform,
    destination: target === "mac"
      ? { name: "My Mac" }
      : target === "device"
      ? { name: "iPhone", identifier: "DEVICE-UDID" }
      : {
        platform: options.platform === "watchos" ? "watchos" : "ios",
        name: options.platform === "watchos" ? "Apple Watch Series 11" : "iPhone 17",
        udid: "SIM-UDID",
        state: "Booted",
        runtime: options.platform === "watchos" ? "watchOS 26.5" : "iOS 18.0",
        runtimeVersion: "18.0",
        versionParts: [18, 0],
        isAvailable: true,
      },
    target,
  };
}
