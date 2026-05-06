import { fail } from "../util/errors.ts";
import { exists, join } from "../util/paths.ts";
import { runCapture } from "../util/process.ts";
import { BuildOptions, resolveDerivedData } from "./xcodebuild.ts";

export async function locateBuiltApp(options: BuildOptions): Promise<string> {
  if (!options.appName) fail("Missing appName in newton.json. Run `newton init --force`.");
  const configuration = options.configuration ?? "Debug";
  const sdk = options.target === "device" ? "iphoneos" : "iphonesimulator";
  const appPath = join(
    resolveDerivedData(options.derivedData),
    "Build",
    "Products",
    `${configuration}-${sdk}`,
    `${options.appName}.app`,
  );
  if (await exists(appPath)) return appPath;
  fail(`Could not locate built .app at ${appPath}.`);
}

export async function readBundleId(appPath: string): Promise<string> {
  const plist = join(appPath, "Info.plist");
  const result = await runCapture("/usr/libexec/PlistBuddy", [
    "-c", // Run the next PlistBuddy command.
    "Print :CFBundleIdentifier", // Read the app bundle identifier from Info.plist.
    plist,
  ], {
    check: false,
  });
  if (result.code !== 0 || !result.stdout.trim()) {
    fail(`Could not read CFBundleIdentifier from ${plist}.`);
  }
  return result.stdout.trim();
}
