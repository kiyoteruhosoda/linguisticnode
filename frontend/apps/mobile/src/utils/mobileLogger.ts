// Mobile in-app logger: captures log entries for the debug screen.
// Debug output is off by default; enable via the debug screen.

export type MobileLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface MobileLogEntry {
  timestamp: string;
  level: MobileLogLevel;
  message: string;
}

const MAX_BUFFER = 500;

class MobileLogger {
  private buffer: MobileLogEntry[] = [];
  private enabled = false;

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  isEnabled() {
    return this.enabled;
  }

  private push(level: MobileLogLevel, message: string) {
    if (!this.enabled) return;
    this.buffer.push({
      timestamp: new Date().toISOString(),
      level,
      message,
    });
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer.shift();
    }
  }

  debug(message: string) {
    this.push('debug', message);
  }

  info(message: string) {
    this.push('info', message);
  }

  warn(message: string) {
    this.push('warn', message);
  }

  error(message: string) {
    this.push('error', message);
  }

  getLogs(): MobileLogEntry[] {
    return [...this.buffer];
  }

  clearLogs() {
    this.buffer = [];
  }

  exportAsText(): string {
    return this.buffer
      .map((e) => `[${e.timestamp}] [${e.level.toUpperCase()}] ${e.message}`)
      .join('\n');
  }
}

export const mobileLogger = new MobileLogger();
