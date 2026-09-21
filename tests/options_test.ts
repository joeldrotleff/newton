import { assertEquals, assertRejects } from "@std/assert";
import { resolveRunOptions } from "../src/commands/options.ts";
import { CONFIG_FILE } from "../src/ios/config.ts";

Deno.test("resolveRunOptions rejects the removed --configuration flag with guidance", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({ scheme: "Axion" }));

    await assertRejects(
      () => resolveRunOptions({ configuration: "Release" }),
      Error,
      "--configuration was removed",
    );
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions rejects newton.json that still has removed fields", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ scheme: "Axion", configuration: "Debug Staging", appName: "Axion" }),
    );

    await assertRejects(
      () => resolveRunOptions({}),
      Error,
      'contains "configuration" and "appName"',
    );
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions selects the Mac destination from config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ platform: "macos", scheme: "Meh" }),
    );

    const options = await resolveRunOptions({});

    assertEquals(options.platform, "macos");
    assertEquals(options.target, "mac");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("resolveRunOptions preserves watchOS platform and simulator target", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ platform: "watchos", scheme: "Bartable" }),
    );

    const options = await resolveRunOptions({});

    assertEquals(options.platform, "watchos");
    assertEquals(options.target, "sim");
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
    await assertRejects(
      () => resolveRunOptions({ device: true, udid: "SIMULATOR-UDID" }),
      Error,
      "can't be combined",
    );
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

Deno.test("resolveRunOptions forwards app arguments", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(CONFIG_FILE, JSON.stringify({}));

    const options = await resolveRunOptions(
      { udid: "SIMULATOR-UDID" },
      ["-LocalTestMode", "YES"],
    );

    assertEquals(options.target, "sim");
    assertEquals(options.udid, "SIMULATOR-UDID");
    assertEquals(options.appArgs, ["-LocalTestMode", "YES"]);
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
