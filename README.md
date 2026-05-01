# Newton

Newton is a standalone CLI for iOS app build, run, screenshot, preview, and SourceKit-LSP workflows.

It is built for fast terminal-driven iOS development: pick a good simulator, build with
`xcodebuild`, install and launch the app, stream logs when useful, and capture screenshots without
opening Xcode.

Newton is intentionally iOS-only.

## Status

Early MVP. The core simulator build/run/screenshot workflow works, plus project initialization,
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

## Quick start in an iOS project

From an iOS project root:

```sh
newton create "My App"
newton build
newton run --no-logs
newton screenshot --display open
```

`newton init` creates `newton.json` with sensible local defaults and adds `.newton/` to
`.gitignore`.

Example `newton.json`:

```json
{
  "scheme": "AtomChatbot",
  "project": "frontend/AtomChatbot/AtomChatbot.xcodeproj",
  "preferredSimulator": "iPhone 17"
}
```

Use `workspace` instead of `project` when the selected Xcode container is an `.xcworkspace`.

## Command reference

### Project setup

```sh
newton create "My App"
newton create "My App" --output ~/code/my-app --bundle-id com.example.myapp
newton create "My App" --team-id 4DQ648JWVG
newton create "My App" --no-team
newton init
newton init --force
```

`newton create` creates a starter SwiftUI iOS app in `ios/`, writes `newton.json`, and adds
`.newton/` to `.gitignore`. By default, the module name is derived by removing characters that are
unsafe for Swift identifiers. During creation, Newton lists Apple Development signing teams detected
from local certificates and prompts for the team to write as `DEVELOPMENT_TEAM`; pass `--team-id` or
`--no-team` to skip the prompt.

`newton init` creates or overwrites local `newton.json` using discovered Xcode project/workspace, a
likely default scheme, and Newton's preferred installed iPhone simulator. Also adds `.newton/` to
`.gitignore`.

### Simulators

```sh
newton sims
newton sims --idiom ipad
newton sims --app-store iphone
newton sims --app-store ipad
```

Lists available iOS simulators, marks Newton's default selection, and marks App Store
screenshot-compatible devices.

### Devices

```sh
newton devices
```

Lists connected iPhone/iPad devices detected by `xcrun devicectl`.

### Signing teams

```sh
newton teams
```

Lists Apple Development signing teams detected from local certificates. Newton uses the certificate
subject's `OU` value as the Xcode `DEVELOPMENT_TEAM` id.

### Open in Xcode

```sh
newton open
newton open --project ios/Axion.xcodeproj
newton open --workspace ios/Axion.xcworkspace
```

Opens the discovered or configured Xcode project/workspace.

### Build

```sh
newton build
newton build --scheme Axion
newton build --scheme Axion --project ios/Axion.xcodeproj
newton build --scheme Axion --workspace ios/Axion.xcworkspace
newton build --scheme Axion --sim "iPhone 17 Pro"
newton build --scheme Axion --target device --device "Joel's iPhone"
```

Builds the selected scheme with `xcodebuild`. If `newton.json` exists, `--scheme`,
`--project`/`--workspace`, and `--sim` can be omitted.

### Run

```sh
newton run
newton run --no-logs
newton run --logs --log-level debug --log-filter chat,sse
newton run --app-store iphone --no-logs
newton run --target device --device "Joel's iPhone" --no-logs
```

Builds, installs, and launches the app on a simulator or connected device.

By default, `run` attaches to the app console. Use `--no-logs` to launch without attaching.

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
newton screenshot --display inline
newton screenshot --display open
newton screenshot --display none
```

Captures the selected simulator screen using `xcrun simctl io screenshot`. By default, Newton uses
the configured preferred simulator or its normal default simulator selection.

### SwiftUI preview host workflow

```sh
newton preview metricCards
newton preview metricCards --display inline
newton preview metricCards --delay 3
```

Runs the app with `-NewtonPreview <name>`, waits briefly, captures a screenshot, and displays it.
This requires app-side opt-in code that maps preview names to SwiftUI views.

### SourceKit-LSP

```sh
newton lsp
newton lsp --scheme Axion
newton lsp --scheme Axion --source-root ios/Axion/Axion
```

Generates `xcode-build-server` files for SourceKit-LSP.

Install the dependency if needed:

```sh
brew install xcode-build-server
```

## Project discovery

Newton resolves the Xcode container in this order:

1. `--project` or `--workspace`
2. `newton.json`
3. recursive search from the current directory

Recursive discovery ignores common generated directories such as `.git`, `.build`, `DerivedData`,
`node_modules`, and `.newton`.

## Simulator selection

Default simulator selection is deterministic:

1. filter to available iOS simulators
2. filter by idiom (`iphone` by default, or `ipad`)
3. prefer newest iOS runtime
4. prefer standard current devices before oversized devices
5. prefer newer hardware generation

Use `--sim "Exact Simulator Name"` to pin a device, or `--app-store iphone|ipad` to choose a
simulator suitable for App Store screenshot dimensions.

## Development

```sh
deno fmt
deno task check
deno task test
deno task compile
deno task install
```
