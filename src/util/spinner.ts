const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL = 80; // ms between frames

export class BuildLogger {
  private spinnerTimer: number | undefined;
  private frameIndex = 0;
  private currentStatus = "";
  private logFile: string;
  private logHandle: Deno.FsFile | null = null;

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
      const encoder = new TextEncoder();
      await this.logHandle.write(encoder.encode(line + "\n"));
    }
  }

  setStatus(status: string): void {
    this.currentStatus = status;
    this.updateSpinner();
  }

  private updateSpinner(): void {
    // Clear previous spinner line
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1b[K"));

    // Write new spinner line
    const frame = SPINNER_FRAMES[this.frameIndex % SPINNER_FRAMES.length];
    const message = this.currentStatus ? `${frame} ${this.currentStatus}` : frame;
    Deno.stdout.writeSync(new TextEncoder().encode(message));
  }

  startSpinner(): void {
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
    // Clear spinner line
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1b[K"));
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
