const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL = 80; // ms between frames
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\r\x1b[K";
const encoder = new TextEncoder();

interface BuildSummary {
  compiledFiles: number;
  warnings: number;
  errors: number;
  packages: number;
  firstError?: string;
  lastError?: string;
}

interface BuildStatus {
  phase?: string;
  target?: string;
  detail?: string;
}

export class BuildLogger {
  private spinnerTimer: number | undefined;
  private frameIndex = 0;
  private currentStatus = "Preparing build";
  private currentPhaseKey = "Preparing build";
  private currentStartedAt = 0;
  private logFile: string;
  private logHandle: Deno.FsFile | null = null;
  private cursorHidden = false;
  private summary: BuildSummary = {
    compiledFiles: 0,
    warnings: 0,
    errors: 0,
    packages: 0,
  };

  constructor(logFile: string) {
    this.logFile = logFile;
  }

  async init(): Promise<void> {
    // Ensure log directory exists
    const dir = this.logFile.substring(0, this.logFile.lastIndexOf("/"));
    try {
      await Deno.mkdir(dir, { recursive: true });
    } catch {
      // Directory may already exist
    }
    this.logHandle = await Deno.open(this.logFile, {
      write: true,
      create: true,
      truncate: true,
    });
  }

  async writeLine(line: string): Promise<void> {
    if (this.logHandle) {
      await this.logHandle.write(encoder.encode(line + "\n"));
    }

    const status = this.parseLine(line);
    if (status) {
      this.setStatus(status);
    }
  }

  setStatus(status: BuildStatus): void {
    const phaseKey = status.phase ?? "Building";
    const formattedStatus = formatStatus(status, this.summary);

    if (phaseKey !== this.currentPhaseKey) {
      this.finishCurrentPhase("✓");
      this.currentPhaseKey = phaseKey;
      this.currentStartedAt = performance.now();
    }

    this.currentStatus = formattedStatus;
    this.updateSpinner();
  }

  finishCurrent(success: boolean): void {
    this.finishCurrentPhase(success ? "✓" : "✗");
  }

  getSummary(): BuildSummary {
    return { ...this.summary };
  }

  private parseLine(line: string): BuildStatus | null {
    const text = line.trim();
    if (!text) return null;

    this.trackDiagnostics(text);

    const packageCount = countResolvedPackages(text);
    if (packageCount > 0) {
      this.summary.packages = packageCount;
      return { phase: "Resolved packages", detail: `${packageCount} packages` };
    }

    const target = extractTarget(text);
    if (target) {
      return { phase: "Building", target };
    }

    if (text.includes("Resolve Package Graph") || text.includes("Fetching from")) {
      return { phase: "Resolving packages" };
    }
    if (text.includes("Checking out") || text.includes("Creating working copy")) {
      return { phase: "Resolving packages" };
    }
    if (text.includes("ComputeTargetDependencyGraph")) {
      return { phase: "Preparing build", detail: "target graph" };
    }
    if (text.includes("CreateBuildRequest") || text.includes("Prepare packages")) {
      return { phase: "Preparing build" };
    }

    const compilePhase = extractCompilePhase(text);
    if (compilePhase) {
      if (compilePhase.countsFile) this.summary.compiledFiles++;
      return { phase: compilePhase.label, target: extractInlineTarget(text) };
    }

    if (text.startsWith("Ld ") || text.includes(" Link ")) {
      return { phase: "Linking", target: extractInlineTarget(text) };
    }
    if (text.startsWith("CodeSign ")) {
      return { phase: "Signing", target: extractInlineTarget(text) };
    }
    if (text.startsWith("ProcessInfoPlistFile ")) {
      return { phase: "Processing Info.plist", target: extractInlineTarget(text) };
    }
    if (text.startsWith("Validate ")) {
      return { phase: "Validating", target: extractInlineTarget(text) };
    }
    if (text.includes("** BUILD SUCCEEDED **") || text.includes("** BUILD FAILED **")) {
      return null;
    }

    return null;
  }

  private trackDiagnostics(text: string): void {
    if (/(^|\s)warning:/.test(text)) {
      this.summary.warnings++;
    }
    if (/(^|\s)error:/.test(text)) {
      this.summary.errors++;
      this.summary.firstError ??= text;
      this.summary.lastError = text;
    }
  }

  private finishCurrentPhase(symbol: "✓" | "✗"): void {
    if (this.currentStartedAt === 0) return;

    Deno.stdout.writeSync(encoder.encode(CLEAR_LINE));
    console.log(
      `${symbol} ${this.currentStatus} · ${
        formatDuration(performance.now() - this.currentStartedAt)
      }`,
    );
    this.currentStartedAt = 0;
  }

  private updateSpinner(): void {
    // Clear previous spinner line
    Deno.stdout.writeSync(encoder.encode(CLEAR_LINE));

    // Write new spinner line
    const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
    const message = this.currentStatus ? `${frame} ${this.currentStatus}...` : frame;
    Deno.stdout.writeSync(encoder.encode(message));
  }

  startSpinner(): void {
    if (this.spinnerTimer !== undefined) {
      return;
    }

    if (Deno.stdout.isTerminal()) {
      Deno.stdout.writeSync(encoder.encode(HIDE_CURSOR));
      this.cursorHidden = true;
    }

    this.currentStartedAt = performance.now();
    this.updateSpinner();
    this.spinnerTimer = setInterval(() => {
      this.frameIndex++;
      this.updateSpinner();
    }, FRAME_INTERVAL);
  }

  stopSpinner(): void {
    if (this.spinnerTimer !== undefined) {
      clearInterval(this.spinnerTimer);
      this.spinnerTimer = undefined;
    }

    const output = this.cursorHidden ? `${CLEAR_LINE}${SHOW_CURSOR}` : CLEAR_LINE;
    Deno.stdout.writeSync(encoder.encode(output));
    this.cursorHidden = false;
  }

  async close(): Promise<void> {
    this.stopSpinner();
    if (this.logHandle) {
      await this.logHandle.close();
      this.logHandle = null;
    }
  }

  getLogFilePath(): string {
    return this.logFile;
  }
}

function formatStatus(status: BuildStatus, summary: BuildSummary): string {
  const parts = [status.phase];
  if (status.target) parts.push(status.target);
  if (status.detail) parts.push(status.detail);

  const counters = [];
  if (summary.compiledFiles > 0) counters.push(`${summary.compiledFiles} files`);
  if (summary.warnings > 0) counters.push(`${summary.warnings} warnings`);
  if (summary.errors > 0) counters.push(`${summary.errors} errors`);

  return `${parts.filter(Boolean).join(" › ")}${
    counters.length ? ` · ${counters.join(" · ")}` : ""
  }`;
}

function formatDuration(milliseconds: number): string {
  return `${(milliseconds / 1_000).toFixed(1)}s`;
}

function countResolvedPackages(text: string): number {
  const match = text.match(/^resolved source packages:\s*(.*)$/i);
  if (!match) return 0;

  return match[1].split(",").map((item) => item.trim()).filter(Boolean).length;
}

function extractTarget(text: string): string | undefined {
  const modern = text.match(/^Target '([^']+)' in project '([^']+)'/);
  if (modern) return modern[1];

  const legacy = text.match(/^=== BUILD TARGET ([^=]+) OF PROJECT/);
  return legacy?.[1].trim();
}

function extractInlineTarget(text: string): string | undefined {
  const match = text.match(/\(in target '([^']+)' from project '[^']+'\)/);
  return match?.[1];
}

function extractCompilePhase(text: string): { label: string; countsFile: boolean } | null {
  if (text.startsWith("SwiftCompile ") || text.startsWith("CompileSwift ")) {
    return { label: "Compiling Swift", countsFile: true };
  }
  if (text.startsWith("CompileC ")) {
    return { label: "Compiling C", countsFile: true };
  }
  if (text.startsWith("CompileCxx ")) {
    return { label: "Compiling C++", countsFile: true };
  }
  if (text.startsWith("CompileAssetCatalog")) {
    return { label: "Compiling assets", countsFile: false };
  }
  if (text.startsWith("CompileStoryboard ") || text.startsWith("CompileXIB ")) {
    return { label: "Compiling interface files", countsFile: true };
  }
  return null;
}

export function getTimestampedLogPath(baseDir = ".newton/logs"): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const time = now.toISOString().split("T")[1]?.split(".")[0]?.replace(/:/g, "-") || "00-00-00"; // HH-MM-SS
  return `${baseDir}/build-${date}-${time}.log`;
}
