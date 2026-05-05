import { assertEquals } from "@std/assert";
import { runOptionsFromFlags } from "../src/commands/options.ts";
import { CONFIG_FILE } from "../src/ios/config.ts";

Deno.test("runOptionsFromFlags reads custom configuration from newton config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ scheme: "Axion", configuration: "Debug Staging" }),
    );

    const options = await runOptionsFromFlags({});

    assertEquals(options.scheme, "Axion");
    assertEquals(options.configuration, "Debug Staging");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("runOptionsFromFlags lets --configuration override newton config", async () => {
  const cwd = Deno.cwd();
  const tempDir = await Deno.makeTempDir();
  try {
    Deno.chdir(tempDir);
    await Deno.writeTextFile(
      CONFIG_FILE,
      JSON.stringify({ configuration: "Debug Staging" }),
    );

    const options = await runOptionsFromFlags({ configuration: "Release Staging" });

    assertEquals(options.configuration, "Release Staging");
  } finally {
    Deno.chdir(cwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
