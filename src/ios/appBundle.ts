import { fail } from "../util/errors.ts";
import { exists, join } from "../util/paths.ts";
import { runCliCommand } from "../util/process.ts";
import { BuildOptions, BuildSettings, showBuildSettings } from "./xcodebuild.ts";

// Asks xcodebuild where the scheme put its app product. Costs an extra
// xcodebuild call (~1s) but always matches the configuration the scheme chose,
// so Newton never has to track configuration or product names itself.
export async function locateBuiltApp(options: BuildOptions): Promise<string> {
  const settings = await showBuildSettings(options);
  const appPath = builtAppPath(settings);
  if (!appPath) {
    fail(`Could not find an app product in build settings for scheme ${options.scheme}.`);
  }
  if (await exists(appPath)) return appPath;
  fail(`Could not locate built .app at ${appPath}.`);
}

export function builtAppPath(settings: BuildSettings[]): string | null {
  const app = settings.find((s) => s.buildSettings?.WRAPPER_NAME?.endsWith(".app"))?.buildSettings;
  if (!app?.TARGET_BUILD_DIR || !app.WRAPPER_NAME) return null;
  return join(app.TARGET_BUILD_DIR, app.WRAPPER_NAME);
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
