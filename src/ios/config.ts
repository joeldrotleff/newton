import { fail } from "../util/errors.ts";
import { dirname, exists, relative, resolve } from "../util/paths.ts";
import { runCliCommand } from "../util/process.ts";
import { discoverProject, XcodeContainer } from "./project.ts";
import { resolveSimulator } from "./simulator.ts";
import { showBuildSettings } from "./xcodebuild.ts";

export const CONFIG_FILE = "newton.json";

export interface NewtonConfig {
  scheme?: string;
  project?: string;
  workspace?: string;
  configuration?: string;
  appName?: string;
  preferredSimulator?: string;
}

export async function loadConfig(cwd = Deno.cwd()): Promise<NewtonConfig> {
  const path = resolve(cwd, CONFIG_FILE);
  if (!await exists(path)) return {};
  return JSON.parse(await Deno.readTextFile(path));
}

export async function missingRequiredConfigFieldMessage(
  field: keyof NewtonConfig,
  cwd = Deno.cwd(),
): Promise<string> {
  const localConfigPath = resolve(cwd, CONFIG_FILE);
  if (await exists(localConfigPath)) {
    return `${CONFIG_FILE} exists at ${localConfigPath} but is missing required field "${field}".\n` +
      `Add "${field}" or rerun \`newton init --force\` from ${cwd}.`;
  }

  const parentConfigPath = await findParentConfig(cwd);
  if (parentConfigPath) {
    const parentDir = dirname(parentConfigPath);
    return `No ${CONFIG_FILE} found in ${cwd}.\n` +
      `Found ${parentConfigPath} in a parent directory. Run Newton from ${parentDir}, or run \`newton init\` here.`;
  }

  return `No ${CONFIG_FILE} found in ${cwd}.\n` +
    `Newton reads ${CONFIG_FILE} from the current directory. If your config lives in a parent directory, run Newton from that directory.\n` +
    `Run \`newton init\` to create one here.`;
}

async function findParentConfig(cwd: string): Promise<string | null> {
  let dir = dirname(resolve(cwd));
  while (true) {
    const candidate = resolve(dir, CONFIG_FILE);
    if (await exists(candidate)) return candidate;

    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function writeInitialConfig(options: { force?: boolean } = {}): Promise<NewtonConfig> {
  if (await exists(CONFIG_FILE) && !options.force) {
    fail(`${CONFIG_FILE} already exists. Pass --force to overwrite.`);
  }

  const container = await discoverProject();
  const schemes = await listSchemes(container);
  const scheme = await chooseScheme(container, schemes);
  const simulator = await resolveSimulator();
  const appSettings = await resolveAppSettings({ container, scheme, simulator });

  const config: NewtonConfig = {
    scheme,
    ...(container.kind === "workspace"
      ? { workspace: relative(Deno.cwd(), container.path) }
      : { project: relative(Deno.cwd(), container.path) }),
    configuration: appSettings.configuration,
    appName: appSettings.appName,
    preferredSimulator: simulator.name,
  };

  await writeConfig(config);
  await ensureInitGitignoreEntries();
  return config;
}

export async function writeConfig(config: NewtonConfig, cwd = Deno.cwd()): Promise<void> {
  await Deno.writeTextFile(resolve(cwd, CONFIG_FILE), `${JSON.stringify(config, null, 2)}\n`);
}

export async function listSchemes(container: XcodeContainer): Promise<string[]> {
  const args = container.kind === "workspace"
    ? [
      "-list", // List projects, targets, and schemes instead of building.
      "-json", // Emit machine-readable project/workspace metadata.
      "-workspace", // Inspect the workspace at the next path.
      container.path,
    ]
    : [
      "-list", // List projects, targets, and schemes instead of building.
      "-json", // Emit machine-readable project metadata.
      "-project", // Inspect the project at the next path.
      container.path,
    ];
  const { stdout } = await runCliCommand("xcodebuild", args);
  const json = JSON.parse(stdout);
  return json.project?.schemes ?? json.workspace?.schemes ?? [];
}

async function resolveAppSettings(options: {
  container: XcodeContainer;
  scheme: string;
  simulator: Awaited<ReturnType<typeof resolveSimulator>>;
}): Promise<{ configuration: string; appName: string }> {
  const settings = await showBuildSettings({
    container: options.container,
    scheme: options.scheme,
    destination: options.simulator,
    target: "sim",
  });
  const appTarget = settings.find((target) => target.buildSettings?.WRAPPER_NAME?.endsWith(".app"));
  const buildSettings = appTarget?.buildSettings;
  if (!buildSettings?.WRAPPER_NAME) {
    fail(`Could not determine app product name for scheme ${options.scheme}.`);
  }
  return {
    configuration: buildSettings.CONFIGURATION ?? "Debug",
    appName: buildSettings.WRAPPER_NAME.replace(/\.app$/, ""),
  };
}

async function chooseScheme(container: XcodeContainer, schemes: string[]): Promise<string> {
  if (schemes.length === 0) fail("No Xcode schemes found for this project/workspace.");
  if (schemes.length === 1) return schemes[0];

  const basename = container.path.split("/").at(-1)?.replace(/\.(xcodeproj|xcworkspace)$/, "");
  const matching = schemes.find((scheme) => scheme === basename);
  if (matching) return matching;

  // Multiple schemes, no match on basename — prompt user to pick
  console.log("Multiple Xcode schemes found:");
  schemes.forEach((scheme, index) => {
    console.log(`  ${index + 1}) ${scheme}`);
  });

  while (true) {
    const answer = await readLine(`Select a scheme [1-${schemes.length}]: `);
    if (answer === null) fail("No scheme selected.");
    const choice = Number(answer.trim());
    if (Number.isInteger(choice) && choice >= 1 && choice <= schemes.length) {
      return schemes[choice - 1];
    }
    console.log(`Enter a number from 1 to ${schemes.length}.`);
  }
}

async function readLine(message: string): Promise<string | null> {
  await Deno.stdout.write(new TextEncoder().encode(message));
  const buffer = new Uint8Array(1024);
  const bytesRead = await Deno.stdin.read(buffer);
  if (bytesRead === null) return null;
  return new TextDecoder().decode(buffer.subarray(0, bytesRead)).split(/\r?\n/, 1)[0];
}

export async function ensureInitGitignoreEntries(): Promise<void> {
  await ensureGitignoreEntry(".newton/");
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
