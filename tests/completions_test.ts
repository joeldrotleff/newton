import { assertEquals } from "@std/assert";
import { buildCli } from "../src/cli.ts";
import { completionTargets } from "../src/commands/completions.ts";

Deno.test("completionTargets uses standard user completion locations", () => {
  const previousHome = Deno.env.get("HOME");
  const previousXdgConfigHome = Deno.env.get("XDG_CONFIG_HOME");
  const previousXdgDataHome = Deno.env.get("XDG_DATA_HOME");
  const previousZdotdir = Deno.env.get("ZDOTDIR");

  try {
    Deno.env.set("HOME", "/tmp/newton-home");
    Deno.env.delete("XDG_CONFIG_HOME");
    Deno.env.delete("XDG_DATA_HOME");
    Deno.env.delete("ZDOTDIR");

    assertEquals(completionTargets(["fish", "zsh", "bash"]), [
      { shell: "fish", path: "/tmp/newton-home/.config/fish/completions/newton.fish" },
      { shell: "zsh", path: "/tmp/newton-home/.zsh/completions/_newton" },
      { shell: "bash", path: "/tmp/newton-home/.local/share/bash-completion/completions/newton" },
    ]);
  } finally {
    restoreEnv("HOME", previousHome);
    restoreEnv("XDG_CONFIG_HOME", previousXdgConfigHome);
    restoreEnv("XDG_DATA_HOME", previousXdgDataHome);
    restoreEnv("ZDOTDIR", previousZdotdir);
  }
});

Deno.test("completionTargets honors XDG and ZDOTDIR overrides", () => {
  const previousHome = Deno.env.get("HOME");
  const previousXdgConfigHome = Deno.env.get("XDG_CONFIG_HOME");
  const previousXdgDataHome = Deno.env.get("XDG_DATA_HOME");
  const previousZdotdir = Deno.env.get("ZDOTDIR");

  try {
    Deno.env.set("HOME", "/tmp/newton-home");
    Deno.env.set("XDG_CONFIG_HOME", "/tmp/xdg-config");
    Deno.env.set("XDG_DATA_HOME", "/tmp/xdg-data");
    Deno.env.set("ZDOTDIR", "/tmp/zdotdir");

    assertEquals(completionTargets(["fish", "zsh", "bash"]), [
      { shell: "fish", path: "/tmp/xdg-config/fish/completions/newton.fish" },
      { shell: "zsh", path: "/tmp/zdotdir/completions/_newton" },
      { shell: "bash", path: "/tmp/xdg-data/bash-completion/completions/newton" },
    ]);
  } finally {
    restoreEnv("HOME", previousHome);
    restoreEnv("XDG_CONFIG_HOME", previousXdgConfigHome);
    restoreEnv("XDG_DATA_HOME", previousXdgDataHome);
    restoreEnv("ZDOTDIR", previousZdotdir);
  }
});

Deno.test("completions subcommand keeps shell-specific generators", () => {
  const completions = buildCli().getCommand("completions");
  if (!completions) throw new Error("completions command not found");

  const shellCommands = completions.getCommands()
    .map((command) => command.getName())
    .filter((name) => ["bash", "fish", "zsh"].includes(name))
    .sort();

  assertEquals(shellCommands, ["bash", "fish", "zsh"]);
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    Deno.env.delete(name);
  } else {
    Deno.env.set(name, value);
  }
}
