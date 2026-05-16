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

Deno.test("resolveRunOptions maps boolean --device to device target with no name", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions({ device: true });

    assertEquals(options.target, "device");
    assertEquals(options.device, undefined);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions passes --device <name> through as device name", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions({ device: "My iPhone" });

    assertEquals(options.target, "device");
    assertEquals(options.device, "My iPhone");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions expands --define values into -D NAME swift flag pairs", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const withDefines = await resolveRunOptions({
      define: ["LOCALHOST_BACKEND", "DEBUG_EXTRA"],
    });
    const noDefines = await resolveRunOptions({});

    assertEquals(withDefines.swiftFlags, [
      "-D",
      "LOCALHOST_BACKEND",
      "-D",
      "DEBUG_EXTRA",
    ]);
    assertEquals(noDefines.swiftFlags, []);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions defaults to sim target and renames appArg to appArgs", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions({ appArg: ["--seed", "42"] });

    assertEquals(options.target, "sim");
    assertEquals(options.appArgs, ["--seed", "42"]);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
