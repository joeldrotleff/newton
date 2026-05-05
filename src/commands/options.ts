import { booleanFlag, CliFlags, stringFlag, stringListFlag } from "../cli/flags.ts";
import { loadConfig } from "../ios/config.ts";
import { RunOptions } from "../ios/run.ts";
import { ScreenshotDisplay } from "../ios/screenshot.ts";

export interface InitCommandOptions {
  force: boolean;
}

export interface CreateCommandOptions {
  name?: string;
  output?: string;
  bundleId?: string;
  teamId?: string;
  noTeam: boolean;
}

export interface ScreenshotCommandOptions {
  output?: string;
  display: ScreenshotDisplay;
  sim?: string;
  udid?: string;
}

export interface PreviewCommandOptions extends ScreenshotCommandOptions {
  name?: string;
  delaySeconds: number;
  appArgs: string[];
  logs: boolean;
}

export interface LspCommandOptions extends RunOptions {
  sourceRoot?: string;
}

export function initOptionsFromFlags(flags: CliFlags): InitCommandOptions {
  return { force: Boolean(flags.force) };
}

export function createOptionsFromFlags(flags: CliFlags): CreateCommandOptions {
  return {
    name: stringFlag(flags, "_arg0"),
    output: stringFlag(flags, "output"),
    bundleId: stringFlag(flags, "bundle-id"),
    teamId: stringFlag(flags, "team-id"),
    noTeam: Boolean(flags["no-team"]),
  };
}

export async function runOptionsFromFlags(flags: CliFlags): Promise<RunOptions> {
  const config = await loadConfig();
  return {
    scheme: stringFlag(flags, "scheme") ?? config.scheme,
    project: stringFlag(flags, "project") ?? config.project,
    workspace: stringFlag(flags, "workspace") ?? config.workspace,
    target: (stringFlag(flags, "target") as "sim" | "device" | undefined) ?? "sim",
    configuration: stringFlag(flags, "configuration") ?? config.configuration,
    derivedData: stringFlag(flags, "derived-data"),
    sim: stringFlag(flags, "sim") ?? config.preferredSimulator,
    udid: stringFlag(flags, "udid"),
    idiom: stringFlag(flags, "idiom") as "iphone" | "ipad" | undefined,
    appStore: stringFlag(flags, "app-store") as "iphone" | "ipad" | undefined,
    device: stringFlag(flags, "device"),
    logs: booleanFlag(flags, "logs"),
    logLevel: stringFlag(flags, "log-level"),
    logFilter: stringFlag(flags, "log-filter"),
    appArgs: stringListFlag(flags, "app-arg"),
    verbose: Boolean(flags.verbose),
  };
}

export async function screenshotOptionsFromFlags(
  flags: CliFlags,
): Promise<ScreenshotCommandOptions> {
  const config = await loadConfig();
  return {
    output: stringFlag(flags, "output"),
    display: (stringFlag(flags, "display") as ScreenshotDisplay | undefined) ?? "none",
    sim: stringFlag(flags, "sim") ?? config.preferredSimulator,
    udid: stringFlag(flags, "udid"),
  };
}

export async function previewOptionsFromFlags(flags: CliFlags): Promise<PreviewCommandOptions> {
  const screenshot = await screenshotOptionsFromFlags(flags);
  return {
    ...screenshot,
    name: stringFlag(flags, "_arg0"),
    display: (stringFlag(flags, "display") as ScreenshotDisplay | undefined) ?? "inline",
    delaySeconds: Number(stringFlag(flags, "delay") ?? "2"),
    appArgs: stringListFlag(flags, "app-arg"),
    logs: booleanFlag(flags, "logs") ?? false,
  };
}

export async function lspOptionsFromFlags(flags: CliFlags): Promise<LspCommandOptions> {
  return {
    ...await runOptionsFromFlags(flags),
    sourceRoot: stringFlag(flags, "source-root"),
  };
}
