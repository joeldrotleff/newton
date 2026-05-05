import { loadConfig } from "../ios/config.ts";
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
  project?: string;
  workspace?: string;
  target?: "sim" | "device";
  configuration?: string;
  derivedData?: string;
  sim?: string;
  udid?: string;
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
  device?: string;
  logs?: boolean;
  logLevel?: string;
  logFilter?: string;
  appArg?: string[];
  verbose?: boolean;
}

export interface ScreenshotCliOptions {
  output?: string;
  display?: ScreenshotDisplay;
  sim?: string;
  udid?: string;
}

export interface PreviewCliOptions extends RunCliOptions, ScreenshotCliOptions {
  delay?: number;
}

export interface LspCliOptions extends RunCliOptions {
  sourceRoot?: string;
}

export interface SimsCliOptions {
  idiom?: "iphone" | "ipad";
  appStore?: "iphone" | "ipad";
}

export interface CleanSimsCliOptions {
  runtime?: string;
}

// Resolves run options by layering CLI flags over the project's newton.json defaults.
export async function resolveRunOptions(opts: RunCliOptions): Promise<RunOptions> {
  const config = await loadConfig();
  return {
    scheme: opts.scheme ?? config.scheme,
    project: opts.project ?? config.project,
    workspace: opts.workspace ?? config.workspace,
    target: opts.target ?? "sim",
    configuration: opts.configuration ?? config.configuration,
    derivedData: opts.derivedData,
    sim: opts.sim ?? config.preferredSimulator,
    udid: opts.udid,
    idiom: opts.idiom,
    appStore: opts.appStore,
    device: opts.device,
    logs: opts.logs,
    logLevel: opts.logLevel,
    logFilter: opts.logFilter,
    appArgs: opts.appArg ?? [],
    verbose: opts.verbose ?? false,
  };
}

export async function resolveScreenshotOptions(opts: ScreenshotCliOptions) {
  const config = await loadConfig();
  return {
    output: opts.output,
    display: opts.display ?? "none" as const,
    sim: opts.sim ?? config.preferredSimulator,
    udid: opts.udid,
  };
}
