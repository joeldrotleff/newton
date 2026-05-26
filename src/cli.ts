import { Command, EnumType } from "@cliffy/command";
import { CompletionsCommand } from "@cliffy/command/completions";
import { HelpCommand } from "@cliffy/command/help";

import { buildLogCommand } from "./commands/build-log.ts";
import { buildCommand } from "./commands/build.ts";
import { cleanSimsCommand } from "./commands/clean-sims.ts";
import { createCommand } from "./commands/create.ts";
import { devicesCommand } from "./commands/devices.ts";
import { initCommand } from "./commands/init.ts";
import { lspCommand } from "./commands/lsp.ts";
import { openCommand } from "./commands/open.ts";
import { previewCommand } from "./commands/preview.ts";
import { psCommand } from "./commands/ps.ts";
import { reloadCommand } from "./commands/reload.ts";
import { runCommand } from "./commands/run.ts";
import { screenshotCommand } from "./commands/screenshot.ts";
import { simsCommand } from "./commands/sims.ts";
import { teamsCommand } from "./commands/teams.ts";

const VERSION = "0.1.0";

// Constrained enum types — cliffy validates the value and feeds them to shell completions.
const idiomType = new EnumType(["iphone", "ipad"]);
const displayType = new EnumType(["inline", "open", "none"]);

// Subcommand option groups are inlined per-command rather than shared via helpers,
// because cliffy's deeply-generic Command type erases option types when threaded
// through helper functions, which silently breaks `.action()` typing.

export function buildCli() {
  return new Command()
    .name("newton")
    .version(VERSION)
    .description(
      "iOS automation toolkit: scaffold, build, run, screenshot, and preview Xcode projects.",
    )
    .meta("Docs", "https://github.com/joeldrotleff/newton")
    .action(function () {
      this.showHelp();
    })
    //
    // init
    //
    .command(
      "init",
      new Command()
        .description("Create newton.json from the current Xcode project & simulator defaults.")
        .option("-f, --force", "Overwrite an existing newton.json")
        .example("Basic", "newton init")
        .example("Overwrite", "newton init --force")
        .action((options) => initCommand(options)),
    )
    //
    // create
    //
    .command(
      "create",
      new Command()
        .description("Scaffold a new SwiftUI iOS project and write its Newton config.")
        .arguments("<name:string>")
        .option("--output <path:file>", "Directory in which to create the project")
        .option("--bundle-id <id:string>", "Bundle identifier (e.g. com.acme.MyApp)")
        .option("--team-id <id:string>", "Apple Development team ID for code signing")
        .option("--no-team", "Skip development-team selection")
        .example("Quickstart", "newton create MyApp")
        .example("Custom bundle id", "newton create MyApp --bundle-id com.acme.MyApp")
        .example("No signing", "newton create MyApp --no-team")
        .action((options, name) => createCommand(name, options)),
    )
    //
    // sims
    //
    .command(
      "sims",
      new Command()
        .type("idiom", idiomType)
        .description("List installed iOS simulators and mark Newton's default choice.")
        .option("--idiom <idiom:idiom>", "Filter to iphone or ipad simulators")
        .option(
          "--app-store <idiom:idiom>",
          "Filter to simulators whose screenshot resolution matches App Store Connect requirements",
        )
        .example("All simulators", "newton sims")
        .example("iPad only", "newton sims --idiom ipad")
        .action((options) => simsCommand(options)),
    )
    //
    // clean-sims
    //
    .command(
      "clean-sims",
      new Command()
        .description("Delete unavailable (orphaned) simulators or all simulators on a runtime.")
        .option(
          "--runtime <version:string>",
          "Delete only simulators on this runtime (e.g. iOS-17-5)",
        )
        .example("Cleanup orphans", "newton clean-sims")
        .example("Clean by runtime", "newton clean-sims --runtime iOS-17-5")
        .action((options) => cleanSimsCommand(options)),
    )
    //
    // devices
    //
    .command(
      "devices",
      new Command()
        .description("List connected physical iPhone & iPad devices visible to Xcode.")
        .action(() => devicesCommand()),
    )
    //
    // teams
    //
    .command(
      "teams",
      new Command()
        .description("List local Apple Development signing teams discovered from certificates.")
        .action(() => teamsCommand()),
    )
    //
    // open
    //
    .command(
      "open",
      new Command()
        .description("Open the configured Xcode project/workspace in Xcode.")
        .action(() => openCommand()),
    )
    //
    // build
    //
    .command(
      "build",
      new Command()
        .type("idiom", idiomType)
        .description("Build the configured scheme for a simulator or connected device.")
        .option("--idiom <idiom:idiom>", "Device idiom (iphone or ipad) for simulator selection")
        .option(
          "--app-store <idiom:idiom>",
          "Pick a simulator whose resolution matches App Store Connect screenshot requirements",
        )
        .option("--device [name:string]", "Build for a connected device (optional name)")
        .option(
          "-D, --define <name:string>",
          "Swift compile-time conditional (repeatable). Equivalent to swiftc -D <name>.",
          { collect: true },
        )
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Build for sim", "newton build")
        .example("Build for device", "newton build --device")
        .example("Active compile flag", "newton build -D LOCALHOST_BACKEND")
        .action((options) => buildCommand(options)),
    )
    //
    // build-log
    //
    .command(
      "build-log",
      new Command()
        .description("Open the latest Newton xcodebuild log in $VISUAL, $EDITOR, or nvim.")
        .example("Open latest build log", "newton build-log")
        .action(() => buildLogCommand()),
    )
    //
    // run
    //
    .command(
      "run",
      new Command()
        .type("idiom", idiomType)
        .description("Build, install, launch, and stream logs for the app.")
        .option("--idiom <idiom:idiom>", "Device idiom (iphone or ipad) for simulator selection")
        .option(
          "--app-store <idiom:idiom>",
          "Pick a simulator whose resolution matches App Store Connect screenshot requirements",
        )
        .option("--device [name:string]", "Run on a connected device (optional name)")
        .option("--detach", "Launch the app and exit without streaming logs")
        .option("--log-level <level:string>", "os_log level filter (e.g. debug, info)")
        .option("--log-filter <predicate:string>", "os_log NSPredicate filter")
        .option("--app-arg <arg:string>", "Extra launch argument (repeatable)", { collect: true })
        .option(
          "-D, --define <name:string>",
          "Swift compile-time conditional (repeatable). Equivalent to swiftc -D <name>.",
          { collect: true },
        )
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Run on default sim", "newton run")
        .example("Run detached", "newton run --detach")
        .example("Run on device", "newton run --device")
        .example("Active compile flag", "newton run -D LOCALHOST_BACKEND")
        .action((options) => runCommand(options)),
    )
    //
    // screenshot
    //
    .command(
      "screenshot",
      new Command()
        .type("display", displayType)
        .description("Capture a screenshot from the selected simulator.")
        .option("--sim <name:string>", "Simulator name")
        .option("--udid <id:string>", "Simulator UDID")
        .option("--output <path:file>", "Output file path")
        .option("--display <mode:display>", "How to display the screenshot", {
          default: "none" as const,
        })
        .example("Save to disk", "newton screenshot --output shot.png")
        .example("Inline preview", "newton screenshot --display inline")
        .action((options) => screenshotCommand(options)),
    )
    //
    // preview
    //
    .command(
      "preview",
      new Command()
        .type("idiom", idiomType)
        .type("display", displayType)
        .description("Run a named app-side preview and capture it as a screenshot.")
        .arguments("<name:string>")
        .option("--idiom <idiom:idiom>", "Device idiom (iphone or ipad) for simulator selection")
        .option(
          "--app-store <idiom:idiom>",
          "Pick a simulator whose resolution matches App Store Connect screenshot requirements",
        )
        .option("--output <path:file>", "Output screenshot file path")
        .option("--display <mode:display>", "How to display the screenshot", {
          default: "inline" as const,
        })
        .option("--delay <seconds:number>", "Seconds to wait before capturing", { default: 2 })
        .option("--app-arg <arg:string>", "Extra launch argument (repeatable)", { collect: true })
        .option("--verbose", "Print verbose xcodebuild output")
        .example("Capture preview", "newton preview metricCards")
        .example("Open in viewer", "newton preview metricCards --display open")
        .action((options, name) => previewCommand(name, options)),
    )
    //
    // reload
    //
    .command(
      "reload",
      new Command()
        .description("Signal a running `newton run` to rebuild and relaunch the app.")
        .example("Reload", "newton reload")
        .action(() => reloadCommand()),
    )
    //
    // ps
    //
    .command(
      "ps",
      new Command()
        .description("Show active Newton run sessions in the current project.")
        .example("List sessions", "newton ps")
        .action(() => psCommand()),
    )
    //
    // lsp
    //
    .command(
      "lsp",
      new Command()
        .description("Generate SourceKit-LSP support files via xcode-build-server.")
        .example("Generate LSP files", "newton lsp")
        .action(() => lspCommand()),
    )
    //
    // help / completions (built-in)
    //
    .command("help", new HelpCommand().global())
    .command("completions", new CompletionsCommand());
}

export async function runCli(args: string[]): Promise<void> {
  await buildCli().parse(args);
}
