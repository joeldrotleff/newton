import { fail } from "../util/errors.ts";
import { missingRequiredConfigFieldMessage } from "./config.ts";
import { exists, join } from "../util/paths.ts";
import { runCliCommand } from "../util/process.ts";
import { defaultDerivedDataPath } from "./project.ts";
import { BuildOptions } from "./xcodebuild.ts";

export async function locateBuiltApp(options: BuildOptions): Promise<string> {
  if (!options.appName) fail(await missingRequiredConfigFieldMessage("appName"));
  const configuration = options.configuration ?? "Debug";
  const productDirectory = buildProductsDirectory(configuration, options.target);
  const appPath = join(
    defaultDerivedDataPath(),
    "Build",
    "Products",
    productDirectory,
    `${options.appName}.app`,
  );
  if (await exists(appPath)) return appPath;
  fail(`Could not locate built .app at ${appPath}.`);
}

function buildProductsDirectory(
  configuration: string,
  target: BuildOptions["target"],
): string {
  switch (target) {
    case "mac":
      return configuration;
    case "device":
      return `${configuration}-iphoneos`;
    case "sim":
      return `${configuration}-iphonesimulator`;
  }
}

export async function readBundleId(appPath: string): Promise<string> {
  const plist = join(appPath, "Info.plist");
  const result = await runCliCommand("/usr/libexec/PlistBuddy", [
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
