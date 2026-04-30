import { fail } from "../util/errors.ts";
import { executableExists, runCapture } from "../util/process.ts";
import { loadConfig, writeInitialConfig } from "./config.ts";
import { createProject } from "./create.ts";
import { captureScreenshot, ScreenshotDisplay } from "./screenshot.ts";
import { listDevices } from "./device.ts";
import { discoverProject } from "./project.ts";
import { isAppStoreCompatible, listSimulators, resolveSimulator } from "./simulator.ts";
import { chooseDevelopmentTeam, listDevelopmentTeams } from "./signing.ts";
import { build, resolveDerivedData, runLspBuild } from "./xcodebuild.ts";
import { runApp, RunOptions } from "./run.ts";
import { join } from "../util/paths.ts";

export async function handleInit(
  flags: Record<string, string | boolean | string[]>,
): Promise<void> {
  const config = await writeInitialConfig({ force: Boolean(flags.force) });
  console.log("Created newton.json");
  console.log(`  scheme: ${config.scheme}`);
  console.log(
    `  ${config.project ? "project" : "workspace"}: ${config.project ?? config.workspace}`,
  );
  console.log(`  preferredSimulator: ${config.preferredSimulator}`);
  console.log("Added .newton/ and newton.json to .gitignore.");
}

export async function handleIos(
  command: string | undefined,
  flags: Record<string, string | boolean | string[]>,
): Promise<void> {
  switch (command) {
    case "create":
      return create(flags);
    case "sims":
      return sims(flags);
    case "devices":
      return devices();
    case "teams":
      return teams();
    case "open":
      return openProject(flags);
    case "build":
      return buildCommand(flags);
    case "run":
      return runApp(await toRunOptions(flags));
    case "screenshot":
      return screenshot(flags);
    case "preview":
      return preview(flags);
    case "lsp":
      return lsp(flags);
    default:
      fail("Usage: newton ios <create|sims|devices|teams|open|build|run|screenshot|preview|lsp>");
  }
}

async function create(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const name = stringFlag(flags, "_arg0");
  if (!name) {
    fail(
      "Usage: newton ios create <name> [--output path] [--bundle-id id] [--team-id id|--no-team]",
    );
  }
  const teamId = flags["no-team"]
    ? undefined
    : stringFlag(flags, "team-id") ?? await chooseDevelopmentTeam();

  const config = await createProject({
    name,
    output: stringFlag(flags, "output"),
    bundleId: stringFlag(flags, "bundle-id"),
    teamId,
  });

  console.log("Created iOS project");
  console.log(`  scheme: ${config.scheme}`);
  console.log(`  project: ${config.project}`);
  if (teamId) console.log(`  developmentTeam: ${teamId}`);
  console.log("Created newton.json and added .newton/ and newton.json to .gitignore.");
}

async function teams(): Promise<void> {
  const teams = await listDevelopmentTeams();
  if (teams.length === 0) {
    console.log("No Apple Development signing teams found.");
    return;
  }

  printTable(
    ["Team ID", "Organization", "Certificate"],
    teams.map((team) => [team.teamId, team.organization, team.commonName]),
  );
}

async function sims(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const idiom = stringFlag(flags, "app-store") ?? stringFlag(flags, "idiom") ?? "iphone";
  const devices = await listSimulators();
  const selected = await resolveSimulator({
    idiom: idiom as "iphone" | "ipad",
    appStore: stringFlag(flags, "app-store") as any,
  }).catch(() => undefined);
  printTable(
    ["Default", "App Store", "Name", "Runtime", "UDID", "State"],
    devices.map((device) => [
      selected?.udid === device.udid ? "*" : "",
      isAppStoreCompatible(device) ? "yes" : "",
      device.name,
      device.runtimeVersion,
      device.udid,
      device.state,
    ]),
  );
}

async function devices(): Promise<void> {
  const devices = await listDevices();
  printTable(
    ["Name", "Identifier", "Hardware UDID", "Platform", "Connection"],
    devices.map((device) => [
      device.name,
      device.identifier,
      device.hardwareUdid ?? "",
      device.platform ?? "",
      device.connectionState ?? "",
    ]),
  );
}

async function openProject(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const options = await toRunOptions(flags);
  const container = await discoverProject(options);
  await runCapture("open", [container.path]);
}

async function buildCommand(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const options = await toRunOptions(flags);
  if (!options.scheme) fail("Missing required --scheme <name>.");
  const target = options.target ?? "sim";
  const container = await discoverProject(options);
  const derivedData = await resolveDerivedData(options.derivedData);
  const destination = target === "device"
    ? await (await import("./device.ts")).resolveDevice(options.device)
    : await resolveSimulator({
      sim: options.sim,
      udid: options.udid,
      idiom: options.idiom,
      appStore: options.appStore,
    });

  await build({ ...options, container, scheme: options.scheme, destination, target, derivedData });
}

async function screenshot(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const config = await loadConfig();
  const path = await captureScreenshot({
    output: stringFlag(flags, "output"),
    display: (stringFlag(flags, "display") as ScreenshotDisplay | undefined) ?? "none",
    sim: stringFlag(flags, "sim") ?? config.preferredSimulator,
    udid: stringFlag(flags, "udid"),
  });
  console.log(`Saved screenshot: ${path}`);
}

async function preview(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const name = stringFlag(flags, "_arg0");
  if (!name) fail("Usage: newton ios preview <name> --scheme <scheme>");
  const delay = Number(stringFlag(flags, "delay") ?? "2");
  const appArgs = [...stringListFlag(flags, "app-arg"), "-NewtonPreview", name];
  await runApp({
    ...await toRunOptions(flags),
    appArgs,
    logs: booleanFlag(flags, "logs") ?? false,
  });
  await new Promise((resolve) => setTimeout(resolve, delay * 1000));
  const config = await loadConfig();
  const path = await captureScreenshot({
    output: stringFlag(flags, "output"),
    display: (stringFlag(flags, "display") as ScreenshotDisplay | undefined) ?? "inline",
    sim: stringFlag(flags, "sim") ?? config.preferredSimulator,
    udid: stringFlag(flags, "udid"),
  });
  console.log(`Saved preview screenshot: ${path}`);
}

async function lsp(flags: Record<string, string | boolean | string[]>): Promise<void> {
  const options = await toRunOptions(flags);
  if (!options.scheme) fail("Missing required --scheme <name>.");
  if (!await executableExists("xcode-build-server")) {
    fail("Missing xcode-build-server. Install it with:\n  brew install xcode-build-server");
  }

  console.log("Preparing SourceKit-LSP files...");
  const container = await discoverProject(options);
  const derivedData = await resolveDerivedData(options.derivedData);
  const simulator = await resolveSimulator({
    sim: options.sim,
    udid: options.udid,
    idiom: options.idiom,
    appStore: options.appStore,
  });
  await (await import("./simulator.ts")).bootSimulator(simulator.udid);

  console.log("Generating xcode-build-server config...");
  await runCapture("xcode-build-server", [
    "config",
    container.kind === "workspace" ? "-workspace" : "-project",
    container.path,
    "-scheme",
    options.scheme,
    "--build_root",
    derivedData,
  ]);

  console.log("Building once to extract compiler settings; xcodebuild output is hidden...");
  await runLspBuild({
    ...options,
    container,
    scheme: options.scheme,
    destination: simulator,
    target: "sim",
    derivedData,
  });

  const sourceRoot = stringFlag(flags, "source-root");
  if (sourceRoot) {
    await Deno.copyFile("buildServer.json", join(sourceRoot, "buildServer.json"));
    await Deno.copyFile(".compile", join(sourceRoot, ".compile"));
  }

  console.log("Generated buildServer.json and .compile for SourceKit-LSP.");
}

async function toRunOptions(
  flags: Record<string, string | boolean | string[]>,
): Promise<RunOptions> {
  const config = await loadConfig();
  return {
    scheme: stringFlag(flags, "scheme") ?? config.scheme,
    project: stringFlag(flags, "project") ?? config.project,
    workspace: stringFlag(flags, "workspace") ?? config.workspace,
    target: (stringFlag(flags, "target") as "sim" | "device" | undefined) ?? "sim",
    configuration: stringFlag(flags, "configuration") ?? "Debug",
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

function stringFlag(
  flags: Record<string, string | boolean | string[]>,
  name: string,
): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function stringListFlag(
  flags: Record<string, string | boolean | string[]>,
  name: string,
): string[] {
  const value = flags[name];
  if (!value) return [];
  return Array.isArray(value) ? value : [String(value)];
}

function booleanFlag(
  flags: Record<string, string | boolean | string[]>,
  name: string,
): boolean | undefined {
  if (flags[`no-${name}`]) return false;
  return typeof flags[name] === "boolean" ? flags[name] : undefined;
}

function printTable(headers: string[], rows: string[][]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index] ?? "").length))
  );
  const format = (row: string[]) =>
    row.map((cell, index) => String(cell).padEnd(widths[index])).join("  ");
  console.log(format(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) console.log(format(row));
}
