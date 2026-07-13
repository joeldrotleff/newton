import { fail } from "../util/errors.ts";
import { dirname, exists, join, relative, resolve } from "../util/paths.ts";
import { ApplePlatform, ensureInitGitignoreEntries, NewtonConfig, writeConfig } from "./config.ts";

function templateRoot(platform: ApplePlatform): string {
  return decodeURIComponent(
    new URL(`../../templates/${platform}-starter`, import.meta.url).pathname,
  );
}

export interface CreateProjectOptions {
  name: string;
  platform?: ApplePlatform;
  output?: string;
  bundleId?: string;
  teamId?: string;
}

interface ProjectNames {
  displayName: string;
  moduleName: string;
  bundleId: string;
  teamId?: string;
  platform: ApplePlatform;
  root: string;
  sourceDir: string;
  projectDir: string;
}

export async function createProject(options: CreateProjectOptions): Promise<NewtonConfig> {
  const names = projectNames(options);
  await ensureCreateSafe(names);

  await writeProjectFiles(names);

  const config: NewtonConfig = {
    platform: names.platform,
    scheme: names.moduleName,
    project: relative(names.root, names.projectDir),
    configuration: "Debug",
    appName: names.moduleName,
  };

  await writeConfig(config, names.root);
  const cwd = Deno.cwd();
  try {
    Deno.chdir(names.root);
    await ensureInitGitignoreEntries();
  } finally {
    Deno.chdir(cwd);
  }

  return config;
}

export function swiftModuleName(name: string): string {
  const sanitized = name.replace(/[^A-Za-z0-9_]/g, "");
  if (!sanitized) fail("Project name must contain at least one letter, number, or underscore.");
  return /^[0-9]/.test(sanitized) ? `App${sanitized}` : sanitized;
}

function projectNames(options: CreateProjectOptions): ProjectNames {
  const root = resolve(options.output ?? Deno.cwd());
  const moduleName = swiftModuleName(options.name);
  const platform = options.platform ?? "ios";
  const sourceDir = join(root, platform);
  return {
    displayName: options.name,
    moduleName,
    bundleId: options.bundleId ?? `com.example.${moduleName}`,
    teamId: options.teamId,
    platform,
    root,
    sourceDir,
    projectDir: join(sourceDir, `${moduleName}.xcodeproj`),
  };
}

async function ensureCreateSafe(names: ProjectNames): Promise<void> {
  if (await exists(names.sourceDir)) {
    fail(`${names.sourceDir} already exists; not overwriting.`);
  }
  if (await exists(join(names.root, "newton.json"))) {
    fail(`${join(names.root, "newton.json")} already exists; not overwriting.`);
  }
}

async function writeProjectFiles(names: ProjectNames): Promise<void> {
  const root = templateRoot(names.platform);
  for await (const templatePath of templateFiles(root)) {
    const outputPath = join(
      names.root,
      renderTemplatePath(relative(root, templatePath), names),
    );
    await writeText(outputPath, renderTemplate(await Deno.readTextFile(templatePath), names));
  }
}

async function* templateFiles(root: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(root)) {
    const path = join(root, entry.name);
    if (entry.isDirectory) yield* templateFiles(path);
    else if (entry.isFile) yield path;
  }
}

async function writeText(path: string, contents: string): Promise<void> {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, contents);
}

function renderTemplatePath(path: string, names: ProjectNames): string {
  return path.replaceAll("__MODULE_NAME__", names.moduleName);
}

function renderTemplate(template: string, names: ProjectNames): string {
  return template
    .replaceAll("__MODULE_NAME__", names.moduleName)
    .replaceAll("__DISPLAY_NAME_SWIFT__", swiftStringLiteralValue(names.displayName))
    .replaceAll("__DISPLAY_NAME_PBX__", pbxString(names.displayName))
    .replaceAll("__BUNDLE_ID_PBX__", pbxString(names.bundleId))
    .replaceAll("__DEVELOPMENT_TEAM_LINE__", developmentTeamLine(names.teamId));
}

function developmentTeamLine(teamId: string | undefined): string {
  return teamId ? `\n\t\t\t\tDEVELOPMENT_TEAM = ${pbxString(teamId)};` : "";
}

function swiftStringLiteralValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function pbxString(value: string): string {
  if (/^[A-Za-z0-9_.$/]+$/.test(value)) return value;
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
