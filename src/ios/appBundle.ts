import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { runCapture } from "../util/process.ts";
import { findApps } from "./project.ts";
import { BuildOptions, showBuildSettings } from "./xcodebuild.ts";

export async function locateBuiltApp(options: BuildOptions): Promise<string> {
  try {
    const settings = await showBuildSettings(options);
    for (const target of settings) {
      const buildSettings = target.buildSettings ?? {};
      if (buildSettings.TARGET_BUILD_DIR && buildSettings.WRAPPER_NAME?.endsWith(".app")) {
        return join(buildSettings.TARGET_BUILD_DIR, buildSettings.WRAPPER_NAME);
      }
    }
  } catch {
    // Fall back to derived data search below.
  }

  const derivedData = options.derivedData ?? ".newton/DerivedData";
  const productsDir = join(derivedData, "Build", "Products");
  const apps = await findApps(productsDir).catch(() => []);
  const schemeMatch = apps.find((path) => path.endsWith(`/${options.scheme}.app`));
  if (schemeMatch) return schemeMatch;
  if (apps.length === 1) return apps[0];

  fail(`Could not locate built .app in ${productsDir}.`);
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
