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
    "record",
    "run",
    "screenshot",
    "sim-create",
    "sim-delete",
    "sims",
    "teams",
    "test",
    "xcode",
  ]);
});

Deno.test("simulator lifecycle subcommands stay narrow", () => {
  const create = buildCli().getCommand("sim-create");
  const remove = buildCli().getCommand("sim-delete");
  if (!create || !remove) throw new Error("simulator lifecycle commands not found");

  assertEquals(create.getOptions().map((option) => option.name), ["device-type", "runtime"]);
  assertEquals(remove.getOptions(), []);
  assertEquals(create.getArguments().map((argument) => argument.name), ["name"]);
  assertEquals(remove.getArguments().map((argument) => argument.name), ["name-or-udid"]);
});

Deno.test("local simulator commands accept exact simulator selectors", () => {
  for (const name of ["build", "test", "run", "screenshot", "preview", "record"]) {
    const command = buildCli().getCommand(name);
    if (!command) throw new Error(`${name} command not found`);
    const options = command.getOptions().map((option) => option.name);
    assertEquals(options.includes("sim"), true, `expected --sim on '${name}'`);
    assertEquals(options.includes("udid"), true, `expected --udid on '${name}'`);
  }
});

Deno.test("record parses duration and output without launching a simulator", async () => {
  const record = buildCli().getCommand("record");
  if (!record) throw new Error("record command not found");
  let received: unknown;
  record.action((options) => {
    received = options;
  });
  await record.parse(["--duration", "0.5", "--output", "demo.mov", "--sim", "iPhone 17"]);
  assertEquals(received, { duration: 0.5, output: "demo.mov", sim: "iPhone 17" });
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
  for (const flag of ["display", "inline-width", "open-simulator", "delay"]) {
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
  for (const flag of ["sim", "udid", "idiom", "app-store", "device", "define", "verbose"]) {
    assertEquals(
      optionNames.includes(flag),
      true,
      `expected --${flag} on 'test', got: ${optionNames.join(", ")}`,
    );
  }
});

Deno.test("run subcommand accepts trailing app arguments", () => {
  const run = buildCli().getCommand("run");
  if (!run) throw new Error("run command not found");

  const optionNames = run.getOptions().map((o) => o.name);
  assertEquals(optionNames.includes("detach"), true);
  assertEquals(optionNames.includes("app-arg"), false);
  assertEquals(run.getArguments().map((argument) => argument.name), ["appArgs"]);
});

Deno.test("run subcommand forwards literal app arguments after the separator", async () => {
  let received: string[] = [];
  const cli = buildCli({
    run: (_options, appArgs = []) => {
      received = appArgs;
      return Promise.resolve();
    },
  });

  await cli.parse([
    "run",
    "--scheme",
    "QuestDev",
    "--",
    "-LocalTestMode",
    "YES",
    "-LocalSandboxURL",
    "https://example.test",
  ]);

  assertEquals(received, [
    "-LocalTestMode",
    "YES",
    "-LocalSandboxURL",
    "https://example.test",
  ]);
});

Deno.test("top-level help mentions newton", () => {
  const help = buildCli().getHelp();
  assertStringIncludes(help, "newton");
});
