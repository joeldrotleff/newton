import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  CONFIG_FILE,
  ensureInitGitignoreEntries,
  missingRequiredConfigFieldMessage,
} from "../src/ios/config.ts";

Deno.test("CONFIG_FILE documents the local config filename", () => {
  assertEquals(CONFIG_FILE, "newton.json");
});

Deno.test("missingRequiredConfigFieldMessage explains when no config exists", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);

    const message = await missingRequiredConfigFieldMessage("scheme");

    assertStringIncludes(message, `No ${CONFIG_FILE} found in ${Deno.cwd()}.`);
    assertStringIncludes(message, "If your config lives in a parent directory");
    assertStringIncludes(message, "Run `newton init` to create one here.");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("missingRequiredConfigFieldMessage points to parent config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    await Deno.writeTextFile(`${tempDir}/${CONFIG_FILE}`, JSON.stringify({ scheme: "Axion" }));
    await Deno.mkdir(`${tempDir}/ios/Axion`, { recursive: true });
    Deno.chdir(`${tempDir}/ios/Axion`);
    const root = Deno.cwd().replace(/\/ios\/Axion$/, "");

    const message = await missingRequiredConfigFieldMessage("scheme");

    assertStringIncludes(message, `No ${CONFIG_FILE} found in ${Deno.cwd()}.`);
    assertStringIncludes(message, `Found ${root}/${CONFIG_FILE} in a parent directory.`);
    assertStringIncludes(message, `Run Newton from ${root}`);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("missingRequiredConfigFieldMessage distinguishes incomplete local config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({ configuration: "Debug" }));

    const message = await missingRequiredConfigFieldMessage("scheme");

    assertStringIncludes(message, `${CONFIG_FILE} exists at ${Deno.cwd()}/${CONFIG_FILE}`);
    assertStringIncludes(message, 'missing required field "scheme"');
    assertStringIncludes(message, 'Add "scheme" or rerun `newton init --force`');
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ensureInitGitignoreEntries ignores generated artifacts", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(".gitignore", "DerivedData/\n");

    await ensureInitGitignoreEntries();

    const gitignore = await Deno.readTextFile(".gitignore");
    assertStringIncludes(gitignore, ".newton/\n");
    assertFalse(gitignore.includes("newton.json"));
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
