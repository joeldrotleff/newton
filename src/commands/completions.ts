import { Command, EnumType } from "@cliffy/command";
import { generateShellCompletions } from "@cliffy/command/completions";

const completionShells = ["fish", "zsh", "bash"] as const;
export type CompletionShell = typeof completionShells[number];

export const completionShellType = new EnumType([...completionShells]);

interface CompletionTarget {
  shell: CompletionShell;
  path: string;
}

interface CompletionOptions {
  shell?: CompletionShell[];
}

export function completionsCommand() {
  return new Command()
    .type("completion-shell", completionShellType)
    .description("Install shell completions, or print a shell-specific completion script.")
    .option(
      "--shell <shell:completion-shell>",
      "Install completions for one shell only (repeatable). Defaults to fish, zsh, and bash.",
      { collect: true },
    )
    .example("Install all standard shell completions", "newton completions")
    .example("Install fish completions only", "newton completions --shell fish")
    .example("Print fish completion script", "newton completions fish")
    .action(async function (options: CompletionOptions) {
      const root = this.getMainCommand();
      const selectedShells = options.shell ? [...new Set(options.shell)] : [...completionShells];
      const targets = completionTargets(selectedShells);

      for (const target of targets) {
        await installCompletion(target, generateShellCompletions(root, target.shell));
        console.log(`Installed ${target.shell} completions: ${target.path}`);
      }

      console.log("Restart your shell, or open a new terminal, to load updated completions.");
      printShellNotes(targets);
    })
    .command("fish", completionPrinterCommand("fish"))
    .command("zsh", completionPrinterCommand("zsh"))
    .command("bash", completionPrinterCommand("bash"));
}

export function completionTargets(shells: CompletionShell[]): CompletionTarget[] {
  const home = envOrUndefined("HOME");
  if (!home) throw new Error("HOME is not set; cannot choose completion install paths.");

  const xdgConfigHome = envOrUndefined("XDG_CONFIG_HOME") ?? `${home}/.config`;
  const xdgDataHome = envOrUndefined("XDG_DATA_HOME") ?? `${home}/.local/share`;
  const zdotdir = envOrUndefined("ZDOTDIR");
  const zshCompletionsDir = zdotdir ? `${zdotdir}/completions` : `${home}/.zsh/completions`;

  return shells.map((shell) => {
    switch (shell) {
      case "fish":
        return { shell, path: `${xdgConfigHome}/fish/completions/newton.fish` };
      case "zsh":
        return { shell, path: `${zshCompletionsDir}/_newton` };
      case "bash":
        return { shell, path: `${xdgDataHome}/bash-completion/completions/newton` };
    }
  });
}

function envOrUndefined(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value && value.length > 0 ? value : undefined;
}

function completionPrinterCommand(shell: CompletionShell) {
  return new Command()
    .description(`Print ${shell} completions to stdout.`)
    .action(function () {
      console.log(generateShellCompletions(this.getMainCommand(), shell));
    });
}

async function installCompletion(target: CompletionTarget, script: string) {
  const directory = target.path.slice(0, target.path.lastIndexOf("/"));
  await Deno.mkdir(directory, { recursive: true });
  await Deno.writeTextFile(target.path, script.endsWith("\n") ? script : `${script}\n`);
}

function printShellNotes(targets: CompletionTarget[]) {
  const shells = new Set(targets.map((target) => target.shell));

  if (shells.has("zsh")) {
    console.log("zsh note: ensure the completions directory is in fpath and compinit is enabled.");
  }

  if (shells.has("bash")) {
    console.log("bash note: requires bash-completion to load user completions.");
  }
}
