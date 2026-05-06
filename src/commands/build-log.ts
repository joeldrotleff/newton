import { fail } from "../util/errors.ts";
import { join } from "../util/paths.ts";
import { runInherit } from "../util/process.ts";

const LOG_DIR = ".newton/logs";

export async function buildLogCommand(): Promise<void> {
  const logPath = await latestBuildLog();
  const editor = Deno.env.get("VISUAL") ?? Deno.env.get("EDITOR") ?? "nvim";
  console.log(`Opening ${logPath}`);
  await runInherit(editor, [logPath]);
}

async function latestBuildLog(): Promise<string> {
  let latest: { path: string; modifiedAt: Date } | undefined;

  try {
    for await (const entry of Deno.readDir(LOG_DIR)) {
      if (!entry.isFile || !entry.name.startsWith("build-") || !entry.name.endsWith(".log")) {
        continue;
      }
      const path = join(LOG_DIR, entry.name);
      const stat = await Deno.stat(path);
      const modifiedAt = stat.mtime ?? new Date(0);
      if (!latest || modifiedAt > latest.modifiedAt) latest = { path, modifiedAt };
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }

  if (!latest) {
    fail(`No build logs found in ${LOG_DIR}. Run \`newton build\` or \`newton run\` first.`);
  }
  return latest.path;
}
