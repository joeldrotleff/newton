const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL = 80; // ms between frames
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR_LINE = "\r\x1b[K";
const encoder = new TextEncoder();

function extractPhase(line: string): string | null {
  // Parse xcodebuild output to extract current build phase
  if (line.includes("Resolve Package Graph") || line.includes("Updating from")) {
    return "Resolving packages";
  }
  if (line.includes("Checking out") || line.includes("Creating working copy")) {
    return "Resolving packages";
  }
  if (line.includes("Resolved source packages") || line.includes("resolved source packages")) {
    return "Preparing build";
  }
  if (line.includes("Building for iOS") || line.includes("Building for macOS")) {
    return "Building";
  }
  if (line.includes("Compiling") || line.includes("Linking")) {
    return "Compiling";
  }
  if (line.includes("Build complete!")) {
    return "Build complete";
  }
  return null;
}

export class BuildLogger {
  private spinnerTimer: number | undefined;
  private frameIndex = 0;
  private currentStatus = "";
  private lastPhase = "";
  private logFile: string;
  private logHandle: Deno.FsFile | null = null;
  private cursorHidden = false;

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

    // Try to extract phase from this line
    const phase = extractPhase(line);
    if (phase && phase !== this.lastPhase) {
      this.lastPhase = phase;
      this.setStatus(phase + "...");
    }
  }

  setStatus(status: string): void {
    this.currentStatus = status;
    this.updateSpinner();
  }

  private updateSpinner(): void {
    // Clear previous spinner line
    Deno.stdout.writeSync(encoder.encode(CLEAR_LINE));

    // Write new spinner line
    const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
    const message = this.currentStatus ? `${frame} ${this.currentStatus}` : frame;
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
    }
  }

  getLogFilePath(): string {
    return this.logFile;
  }
}

export function getTimestampedLogPath(baseDir = ".newton/logs"): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const time = now.toISOString().split("T")[1]?.split(".")[0]?.replace(/:/g, "-") || "00-00-00"; // HH-MM-SS
  return `${baseDir}/build-${date}-${time}.log`;
}
