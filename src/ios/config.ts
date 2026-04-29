import { fail } from "../util/errors.ts";
import { exists, relative, resolve } from "../util/paths.ts";
import { runCapture } from "../util/process.ts";
import { discoverProject, XcodeContainer } from "./project.ts";
import { resolveSimulator } from "./simulator.ts";

export const CONFIG_FILE = "newton.json";

export interface NewtonConfig {
  scheme?: string;
  project?: string;
  workspace?: string;
  preferredSimulator?: string;
}

export async function loadConfig(cwd = Deno.cwd()): Promise<NewtonConfig> {
  const path = resolve(cwd, CONFIG_FILE);
  if (!await exists(path)) return {};
  return JSON.parse(await Deno.readTextFile(path));
}

export async function writeInitialConfig(options: { force?: boolean } = {}): Promise<NewtonConfig> {
  if (await exists(CONFIG_FILE) && !options.force) {
    fail(`${CONFIG_FILE} already exists. Pass --force to overwrite.`);
  }

  const container = await discoverProject();
  const schemes = await listSchemes(container);
  const scheme = chooseScheme(container, schemes);
  const simulator = await resolveSimulator();

  const config: NewtonConfig = {
    scheme,
    ...(container.kind === "workspace"
      ? { workspace: relative(Deno.cwd(), container.path) }
      : { project: relative(Deno.cwd(), container.path) }),
    preferredSimulator: simulator.name,
  };

  await Deno.writeTextFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);
  await ensureGitignoreEntry(".newton/");
  return config;
}

export async function listSchemes(container: XcodeContainer): Promise<string[]> {
  const args = container.kind === "workspace"
    ? ["-list", "-json", "-workspace", container.path]
    : ["-list", "-json", "-project", container.path];
  const { stdout } = await runCapture("xcodebuild", args);
  const json = JSON.parse(stdout);
  return json.project?.schemes ?? json.workspace?.schemes ?? [];
}

function chooseScheme(container: XcodeContainer, schemes: string[]): string {
  if (schemes.length === 0) fail("No Xcode schemes found for this project/workspace.");
  if (schemes.length === 1) return schemes[0];

  const basename = container.path.split("/").at(-1)?.replace(/\.(xcodeproj|xcworkspace)$/, "");
  const matching = schemes.find((scheme) => scheme === basename);
  return matching ?? schemes[0];
}

async function ensureGitignoreEntry(entry: string): Promise<void> {
  const path = ".gitignore";
  if (!await exists(path)) {
    await Deno.writeTextFile(path, `${entry}\n`);
    return;
  }

  const contents = await Deno.readTextFile(path);
  const lines = contents.split(/\r?\n/).map((line) => line.trim());
  if (lines.includes(entry)) return;

  const separator = contents.endsWith("\n") || contents.length === 0 ? "" : "\n";
  await Deno.writeTextFile(path, `${contents}${separator}${entry}\n`);
}
