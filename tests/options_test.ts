import { assertEquals } from "@std/assert";
import { resolveRunOptions } from "../src/commands/options.ts";
import { CONFIG_FILE } from "../src/ios/config.ts";

Deno.test("resolveRunOptions reads custom configuration from newton config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ scheme: "Axion", configuration: "Debug Staging" }),
    );

    const options = await resolveRunOptions({});

    assertEquals(options.scheme, "Axion");
    assertEquals(options.configuration, "Debug Staging");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions defaults logs on without --detach", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions({});

    assertEquals(options.logs, true);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions treats --detach as launch without logs", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions({ detach: true });

    assertEquals(options.logs, false);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
