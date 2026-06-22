import { loadConfig, resolveSchemeSettings } from "../ios/config.ts";
import { RunOptions } from "../ios/run.ts";
import { ScreenshotDisplay } from "../ios/screenshot.ts";

// Cliffy converts kebab-case flags (e.g. --bundle-id) to camelCase keys (bundleId).
// These option types describe what each subcommand's `.action()` receives.

export interface InitCommandOptions {
  force?: boolean;
}

export interface CreateCommandOptions {
  output?: string;
  bundleId?: string;
  teamId?: string;
  team?: boolean; // false when --no-team is passed; cliffy default true
}

export interface RunCliOptions {
  scheme?: string;
  configuration?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string | boolean;
  detach?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArg?: string[];
  define?: string[];
  verbose?: boolean;
}

export interface TestCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string | boolean;
  define?: string[];
  verbose?: boolean;
}

export interface ScreenshotCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  inlineWidth?: number;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface PreviewCliOptions extends RunCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  delay?: number;
  inlineWidth?: number;
  openSimulator?: boolean;
}

export interface SimsCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface CleanSimsCliOptions {
  runtime?: string;
}

// Resolves run options from newton.json plus CLI-only flags (idiom, device, logging, etc.).
export async function resolveRunOptions(opts: RunCliOptions): Promise<RunOptions> {
  const config = await loadConfig();
  // --device (with or without a value) selects a connected device; otherwise use the simulator.
  const deviceName = typeof opts.device === "string" ? opts.device : undefined;
  const target = opts.device ? "device" : "sim";

  // CLI flags override newton.json so a single project can run multiple schemes
  // (e.g. a QuestDev build) without editing the file. A scheme pins its own
  // configuration and product, so when --scheme is given we read those from the
  // scheme itself — no need to repeat --configuration to match it.
  const scheme = opts.scheme ?? config.scheme;
  let configuration = opts.configuration ?? config.configuration;
  let appName = config.appName;
  if (opts.scheme) {
    const derived = await resolveSchemeSettings(opts.scheme);
    configuration = opts.configuration ?? derived.configuration ?? config.configuration;
    appName = derived.appName ?? config.appName;
  }

  return {
    scheme,
    project: config.project,
    workspace: config.workspace,
    target,
    configuration,
    appName,
    // Soft default; resolveSimulator ignores it when an idiom/app-store flag is present.
    preferred: config.preferredSimulator,
    idiom: opts.idiom,
    appStore: opts.appStore,
    device: deviceName,
    logs: !opts.detach,
    logLevel: opts.logLevel,
    logFilter: opts.logFilter,
    appArgs: opts.appArg ?? [],
    // Each --define NAME expands to two argv tokens (`-D`, `NAME`) so they survive
    // xcodebuild's OTHER_SWIFT_FLAGS parsing intact for swiftc.
    swiftFlags: (opts.define ?? []).flatMap((name) => ["-D", name]),
    verbose: opts.verbose ?? false,
  };
}

export async function resolveScreenshotOptions(opts: ScreenshotCliOptions) {
  const config = await loadConfig();
  return {
    output: opts.output,
    display: opts.display ?? "none" as const,
    inlineWidth: opts.inlineWidth,
    sim: opts.sim,
    udid: opts.udid,
    idiom: opts.idiom,
    appStore: opts.appStore,
    preferred: config.preferredSimulator,
  };
}
