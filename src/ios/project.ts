import { fail } from "../util/errors.ts";
import { loadConfig } from "./config.ts";
import { dirname, join, relative, resolve, walkFiles } from "../util/paths.ts";

export type XcodeContainer =
  | { kind: "project"; path: string }
  | { kind: "workspace"; path: string };

export async function discoverProject(): Promise<XcodeContainer> {
  const config = await loadConfig();
  if (config.project) return { kind: "project", path: resolve(config.project) };
  if (config.workspace) return { kind: "workspace", path: resolve(config.workspace) };

  const cwd = Deno.cwd();
  const projects: string[] = [];
  const workspaces: string[] = [];

  await collectContainers(cwd, projects, workspaces);

  if (workspaces.length === 1) return { kind: "workspace", path: workspaces[0] };
  if (workspaces.length === 0 && projects.length === 1) {
    return { kind: "project", path: projects[0] };
  }

  const candidates = [...workspaces, ...projects];
  if (candidates.length === 0) {
    fail("No .xcworkspace or .xcodeproj found. Run `newton init` to set one up.");
  }

  fail(
    `Multiple Xcode projects/workspaces found. Run \`newton init\` to pick one:\n${
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
        // Skip SPM-generated workspaces (.swiftpm/xcode/package.xcworkspace)
        if (!path.includes(".swiftpm")) {
          workspaces.push(path);
        }
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
    ? [
      "-workspace", // Build/open settings from this Xcode workspace.
      container.path,
    ]
    : [
      "-project", // Build/open settings from this Xcode project.
      container.path,
    ];
}

export function defaultDerivedDataPath(cwd = Deno.cwd()): string {
  return join(cwd, ".newton", "DerivedData");
}

export async function findApps(root: string): Promise<string[]> {
  const apps: string[] = [];
  for await (const file of walkFiles(root)) {
    if (file.endsWith(".app/Info.plist")) apps.push(dirname(file));
  }
  return apps;
}
