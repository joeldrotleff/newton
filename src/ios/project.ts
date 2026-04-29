import { fail } from "../util/errors.ts";
import { dirname, exists, join, relative, resolve, walkFiles } from "../util/paths.ts";

export type XcodeContainer =
  | { kind: "project"; path: string }
  | { kind: "workspace"; path: string };

export interface ProjectOptions {
  project?: string;
  workspace?: string;
  cwd?: string;
}

export async function discoverProject(options: ProjectOptions = {}): Promise<XcodeContainer> {
  if (options.project && options.workspace) fail("Pass either --project or --workspace, not both.");
  if (options.project) return { kind: "project", path: resolve(options.project) };
  if (options.workspace) return { kind: "workspace", path: resolve(options.workspace) };

  const cwd = options.cwd ?? Deno.cwd();
  const projects: string[] = [];
  const workspaces: string[] = [];

  await collectContainers(cwd, projects, workspaces);

  if (workspaces.length === 1) return { kind: "workspace", path: workspaces[0] };
  if (workspaces.length === 0 && projects.length === 1) {
    return { kind: "project", path: projects[0] };
  }

  const candidates = [...workspaces, ...projects];
  if (candidates.length === 0) {
    fail("No .xcworkspace or .xcodeproj found. Pass --project or --workspace.");
  }

  fail(
    `Multiple Xcode projects/workspaces found. Pass --project or --workspace:\n${
      candidates.map((path) => `  - ${relative(cwd, path)}`).join("\n")
    }`,
  );
}

async function collectContainers(
  root: string,
  projects: string[],
  workspaces: string[],
): Promise<void> {
  const ignored = new Set([".git", ".build", "DerivedData", "node_modules", ".newton"]);

  async function walk(dir: string): Promise<void> {
    for await (const entry of Deno.readDir(dir)) {
      if (!entry.isDirectory || ignored.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.name.endsWith(".xcworkspace")) {
        workspaces.push(path);
        continue;
      }
      if (entry.name.endsWith(".xcodeproj")) {
        projects.push(path);
        continue;
      }
      await walk(path);
    }
  }

  await walk(root);
}

export function containerArgs(container: XcodeContainer): string[] {
  return container.kind === "workspace"
    ? ["-workspace", container.path]
    : ["-project", container.path];
}

export async function defaultDerivedDataPath(cwd = Deno.cwd()): Promise<string> {
  if (await exists(join(cwd, "ios"))) return join(cwd, "ios", ".build", "DerivedData");
  return join(cwd, ".newton", "DerivedData");
}

export async function findApps(root: string): Promise<string[]> {
  const apps: string[] = [];
  for await (const file of walkFiles(root)) {
    if (file.endsWith(".app/Info.plist")) apps.push(dirname(file));
  }
  return apps;
}
