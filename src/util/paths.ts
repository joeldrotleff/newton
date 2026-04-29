import { dirname, join, relative, resolve } from "@std/path";

export { dirname, join, relative, resolve };

export async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

export async function ensureDir(path: string): Promise<void> {
  await Deno.mkdir(path, { recursive: true });
}

export function timestamp(): string {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

export async function* walkFiles(root: string): AsyncGenerator<string> {
  const ignored = new Set([".git", ".build", "DerivedData", "node_modules", ".newton"]);

  async function* walk(dir: string): AsyncGenerator<string> {
    for await (const entry of Deno.readDir(dir)) {
      if (ignored.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory) {
        yield* walk(path);
      } else {
        yield path;
      }
    }
  }

  yield* walk(root);
}
