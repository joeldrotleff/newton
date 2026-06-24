import { assertEquals, assertStringIncludes } from "@std/assert";
import { buildCli } from "../src/cli.ts";

Deno.test("buildCli registers all top-level subcommands", () => {
  const cli = buildCli();
  const names = cli.getCommands().map((c) => c.getName()).sort();

  assertEquals(names, [
    "build",
    "build-log",
    "clean-sims",
    "completions",
    "create",
    "devices",
    "help",
    "init",
    "lsp",
    "open",
    "preview",
    "ps",
    "reload",
    "run",
    "screenshot",
    "sims",
    "teams",
    "test",
    "xcode",
  ]);
});

Deno.test("open subcommand targets an already booted simulator", () => {
  const open = buildCli().getCommand("open");
  if (!open) throw new Error("open command not found");

  const optionNames = open.getOptions().map((o) => o.name);
  assertEquals(optionNames.includes("sim"), false);
  assertEquals(optionNames.includes("udid"), false);
});

Deno.test("preview subcommand declares simulator screenshot options", () => {
  const preview = buildCli().getCommand("preview");
  if (!preview) throw new Error("preview command not found");

  const optionNames = preview.getOptions().map((o) => o.name);
  for (const flag of ["display", "inline-width", "open-simulator", "delay", "app-arg"]) {
    assertEquals(
      optionNames.includes(flag),
      true,
      `expected --${flag} on 'preview', got: ${optionNames.join(", ")}`,
    );
  }
  assertEquals(optionNames.includes("device"), false);
});

Deno.test("test subcommand declares build-like options", () => {
  const test = buildCli().getCommand("test");
  if (!test) throw new Error("test command not found");

  const optionNames = test.getOptions().map((o) => o.name);
  for (const flag of ["idiom", "app-store", "device", "define", "verbose"]) {
    assertEquals(
      optionNames.includes(flag),
      true,
      `expected --${flag} on 'test', got: ${optionNames.join(", ")}`,
    );
  }
});

Deno.test("run subcommand declares detach option", () => {
  const run = buildCli().getCommand("run");
  if (!run) throw new Error("run command not found");

  const optionNames = run.getOptions().map((o) => o.name);
  assertEquals(
    optionNames.includes("detach"),
    true,
    `expected --detach on 'run', got: ${optionNames.join(", ")}`,
  );
});

Deno.test("top-level help mentions newton", () => {
  const help = buildCli().getHelp();
  assertStringIncludes(help, "newton");
});
