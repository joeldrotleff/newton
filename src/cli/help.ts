export function printHelp(): void {
  console.log(`Newton iOS CLI

Usage:
  newton init [--force]
  newton create <name> [--output path] [--bundle-id id] [--team-id id|--no-team]
  newton sims [--idiom iphone|ipad] [--app-store iphone|ipad]
  newton devices
  newton teams
  newton open [--project path|--workspace path]
  newton build --scheme <scheme> [--project path|--workspace path]
  newton run --scheme <scheme> [--sim name] [--target sim|device] [--no-logs]
  newton screenshot [--output path] [--display inline|open|none]
  newton preview <name> --scheme <scheme> [--display inline|open|none]
  newton lsp --scheme <scheme> [--source-root path]
`);
}
