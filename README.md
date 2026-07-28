# Newton

Newton is a standalone CLI for iOS, watchOS, and macOS app scaffolding, build, run, test,
screenshot, preview, and SourceKit-LSP workflows.

It is built for fast terminal-driven Apple platform development: scaffold native SwiftUI projects,
build with `xcodebuild`, launch apps, stream logs when useful, and capture iOS or watchOS simulator
screenshots without opening Xcode.

Simulator, connected-device, screenshot, and preview commands support iOS and watchOS. Native macOS
projects support create, build, run, Xcode, build-log, and LSP workflows.

## Status

Early MVP. The core simulator build/test/run/screenshot workflow works, plus project initialization,
real-device listing, and initial LSP/preview commands.

## Requirements

- macOS
- Xcode command line tools / Xcode
- Deno, for development and local compilation
- Optional: `xcode-build-server` for SourceKit-LSP support
- Optional: `viu`, `kitten`, `imgcat`, or `wezterm` for inline screenshot display

## Install from source

```sh
git clone https://github.com/joeldrotleff/newton.git
cd newton
deno task install
```

This compiles the standalone binary and copies it to `~/.local/bin/newton`.

Make sure `~/.local/bin` is on your `PATH`. For Fish:

```fish
fish_add_path ~/.local/bin
```

Install or refresh shell completions:

```sh
newton completions
```

This writes Fish, Zsh, and Bash completion files to standard user-level locations. Use
`newton completions --shell fish` for a single shell, or `newton completions fish` to print a
completion script to stdout.

To only compile without installing:

```sh
deno task compile
```

The standalone binary is written to `./newton`.

To uninstall:

```sh
deno task uninstall
```

For local development without compiling:

```sh
deno run --allow-run --allow-read --allow-write --allow-env src/main.ts --help
```

## Quick start

Create and run an iOS project:

```sh
newton create "My App"
newton build
newton test
newton run --detach
newton screenshot --display open
```

Create and run a watchOS project:

```sh
newton create "Wrist Notes" --platform watchos
newton build
newton run --detach
newton screenshot --display open
```

Create and run a native macOS project:

```sh
newton create "Menu Helper" --platform macos
newton build
newton run --detach
```

`newton init` creates `newton.json` with sensible local defaults and adds `.newton/` to
`.gitignore`.

Example `newton.json`:

```json
{
  "platform": "ios",
  "scheme": "MyApp",
  "project": "ios/MyApp.xcodeproj",
  "configuration": "Debug",
  "appName": "MyApp",
  "preferredSimulator": "iPhone 17"
}
```

Use `workspace` instead of `project` when the selected Xcode container is an `.xcworkspace`. All
fields are optional; `newton init` writes them based on the current Xcode project.

## Command reference

### Project setup

```sh
newton create "My App"
newton create "Wrist Notes" --platform watchos
newton create "Menu Helper" --platform macos
newton create "My App" --output ~/code/my-app --bundle-id com.example.myapp
newton create "My App" --team-id 4DQ648JWVG
newton create "My App" --no-team
newton init
newton init --platform watchos
newton init --force
```

`newton create` creates a starter SwiftUI app, writes `newton.json`, and adds `.newton/` to
`.gitignore`. It creates an iOS app under `ios/` by default; pass `--platform watchos` for a
watch-only app under `watchos/`, or `--platform macos` for a native Mac app under `macos/`. By
default, the module name is derived by removing characters that are unsafe for Swift identifiers.
During creation, Newton lists Apple Development signing teams detected from local certificates and
prompts for the team to write as `DEVELOPMENT_TEAM`; pass `--team-id` or `--no-team` to skip the
prompt.

`newton init` creates or overwrites local `newton.json` using the discovered Xcode
project/workspace, a likely default scheme, and Newton's preferred installed simulator. Pass
`--platform watchos` for an existing Watch app. It also adds `.newton/` to `.gitignore`.

### Simulators

```sh
newton sims
newton sims --idiom ipad
newton sims --app-store iphone
newton sims --app-store ipad
```

Lists available simulators for the platform in `newton.json` and marks Newton's default selection.
For iOS, it also marks App Store screenshot-compatible devices.

### Clean simulators

```sh
newton clean-sims
newton clean-sims --runtime 18.0
newton clean-sims --runtime 26.1
```

Deletes simulators. Without `--runtime`, deletes all unavailable (orphaned) simulators — these
become unavailable when their runtime is no longer installed, typically after upgrading Xcode.

With `--runtime`, deletes all simulators for the specified version and configured platform. Run this
as your normal user, not with `sudo`; if CoreSimulator reports permission errors, fix ownership of
`~/Library/Developer/CoreSimulator` and retry.

### Devices (connected)

```sh
newton devices
```

Lists connected physical iPhone, iPad, and Apple Watch devices detected by `xcrun devicectl`.

### Signing teams

```sh
newton teams
```

Lists Apple Development signing teams detected from local certificates. Newton uses the certificate
subject's `OU` value as the Xcode `DEVELOPMENT_TEAM` id.

### Open in Xcode

```sh
newton xcode
```

Opens the Xcode project/workspace recorded in `newton.json`.

### Open a link in Simulator

```sh
newton open https://staging.sign-in.quest/XXujr66OeXY
```

Opens an HTTP(S) link in an already booted simulator. If multiple iOS simulators are booted, Newton
prompts you to choose one.

### Build

```sh
newton build
newton build --idiom ipad
newton build --app-store iphone
newton build --device
newton build --device "Joel's iPhone"
newton build --verbose
```

Builds the configured scheme with `xcodebuild`. Platform, scheme, project/workspace, and
configuration come from `newton.json`. macOS projects build for the local Mac. iOS and watchOS
projects build for their preferred simulator by default; use `--device` to target a connected
device. The `--idiom` and `--app-store` filters apply only to iOS.

### Test

```sh
newton test
newton test --idiom ipad
newton test --app-store iphone
newton test --device
newton test --device "Joel's iPhone"
newton test --verbose
```

Runs the configured scheme's tests with `xcodebuild test`. Scheme, project/workspace, and
configuration come from `newton.json`. Use `--idiom` or `--app-store` to pick a simulator other than
the default, or `--device` to target a connected device.

### Build log

```sh
newton build-log
```

Opens the most recent `xcodebuild` log (under `.newton/logs/`) in `$VISUAL`, `$EDITOR`, or `nvim`.

### Run

```sh
newton run
newton run --detach
newton run --log-level debug --log-filter chat
newton run --app-store iphone --detach
newton run --device --detach
newton run --device "Joel's iPhone"
```

Builds and launches the app on its configured platform. iOS and watchOS apps are installed on a
simulator or connected device; macOS apps launch directly on the local Mac.

By default, `run` attaches to the app console. Use `--detach` to launch and exit without streaming
logs.

Convenience logging flags are passed as app launch arguments:

```sh
--log-level debug   -> -LogLevel debug
--log-filter chat   -> -LogFilter chat
```

Raw app launch args can be repeated:

```sh
newton run --app-arg -SomeFlag --app-arg value
```

### Screenshots

```sh
newton screenshot
newton screenshot --output .newton/screenshots/home.png
newton screenshot --sim "iPhone 17 Pro"
newton screenshot --display inline
newton screenshot --display inline --inline-width 60
newton screenshot --display open
newton screenshot --display none
```

Captures the selected simulator screen using `xcrun simctl io screenshot`. Inline terminal display
uses a small preview by default; pass `--inline-width` to resize it. By default, Newton uses the
`preferredSimulator` from `newton.json`, or the normal default selection for the configured
platform.

### SwiftUI preview host workflow

```sh
newton preview metricCards
newton preview metricCards --display inline
newton preview metricCards --inline-width 60
newton preview metricCards --delay 3
newton preview metricCards --open-simulator
```

Runs the app with `-NewtonPreview <name>`, waits briefly, captures a screenshot, and displays it.
Preview runs headlessly by default: Newton boots and controls CoreSimulator without opening
Simulator.app. Pass `--open-simulator` when you want to watch the capture.

This requires app-side opt-in code that maps preview names to SwiftUI views.

#### Adding preview support to your app

1. Read the `-NewtonPreview` launch argument from `UserDefaults` (launch args are automatically
   parsed into `UserDefaults`) and route to a preview container before the normal app flow.

   ```swift
   // MyAppApp.swift
   #if DEBUG
   private let previewName: String? = UserDefaults.standard.string(forKey: "NewtonPreview")
   #endif

   var body: some Scene {
       WindowGroup {
           #if DEBUG
           if let previewName {
               NewtonPreviewContainer(name: previewName)
           } else {
               appContent
           }
           #else
           appContent
           #endif
       }
   }
   ```

2. Create a `NewtonPreviewContainer` that maps preview names to the views you want to screenshot.
   For sheets, present them from a simple background view.

   ```swift
   // NewtonPreviewContainer.swift
   #if DEBUG
   import SwiftUI

   struct NewtonPreviewContainer: View {
       let name: String

       var body: some View {
           switch name {
           case "metricCards":
               MetricCardsPreview()
           default:
               Text("Unknown preview: \(name)")
                   .frame(maxWidth: .infinity, maxHeight: .infinity)
           }
       }
   }

   private struct MetricCardsPreview: View {
       var body: some View {
           Color(.systemGroupedBackground)
               .ignoresSafeArea()
               .sheet(isPresented: .constant(true)) {
                   MetricCardsSheet()
               }
       }
   }
   #endif
   ```

3. Capture the preview:

   ```sh
   newton preview metricCards --output /tmp/preview.png --display none
   ```

Use `--display none` when you don't have an inline image renderer (e.g. `viu`) installed; the
screenshot is still saved to the path you specify.

### SourceKit-LSP

```sh
newton lsp
```

Generates `buildServer.json` for SourceKit-LSP using Newton's derived data root and the scheme from
`newton.json`. Takes no options.

Install the dependency if needed:

```sh
brew install xcode-build-server
```

## Project discovery

Newton resolves the Xcode container in this order:

1. `project` or `workspace` from `newton.json`
2. recursive search from the current directory

Recursive discovery ignores common generated directories such as `.git`, `.build`, `DerivedData`,
`node_modules`, and `.newton`. SPM-generated `.swiftpm/.../package.xcworkspace` is also skipped.

## Simulator selection

Default simulator selection is deterministic:

1. filter to the configured platform and available devices
2. filter iOS devices by idiom (`iphone` by default, or `ipad`)
3. prefer the newest runtime
4. prefer current standard models and larger standard case sizes
5. prefer newer hardware generations

Set `preferredSimulator` in `newton.json` to pin a default. For iOS, use `--idiom ipad` to switch
idiom, or `--app-store iphone|ipad` to choose a simulator whose screenshot resolution matches App
Store Connect requirements. watchOS projects select from installed Apple Watch simulators. The
`screenshot` command additionally accepts `--sim "Exact Name"`/`--udid` to override the default for
a single capture.

## Development

```sh
deno fmt
deno task check
deno task test
deno task compile
deno task install
```
