import { assertEquals, assertStringIncludes } from "@std/assert";
import { CONFIG_FILE, ensureInitGitignoreEntries } from "../src/ios/config.ts";

Deno.test("CONFIG_FILE documents the local config filename", () => {
  assertEquals(CONFIG_FILE, "newton.json");
});

Deno.test("ensureInitGitignoreEntries ignores config and generated artifacts", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(".gitignore", "DerivedData/\n");

    await ensureInitGitignoreEntries();

    const gitignore = await Deno.readTextFile(".gitignore");
    assertStringIncludes(gitignore, ".newton/\n");
    assertStringIncludes(gitignore, "newton.json\n");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
