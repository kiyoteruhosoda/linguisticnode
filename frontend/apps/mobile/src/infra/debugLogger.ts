/**
 * インメモリデバッグロガー
 * 最大 MAX_LOGS 行を循環バッファで保持し、Settings 画面からダウンロード可能にする。
 */

const MAX_LOGS = 1000;
const buffer: string[] = [];

function ts(): string {
  return new Date().toISOString();
}

export const debugLogger = {
  log(tag: string, message: string): void {
    const line = `${ts()} [${tag}] ${message}`;
    if (buffer.length >= MAX_LOGS) {
      buffer.shift();
    }
    buffer.push(line);
  },

  getLogs(): string {
    return buffer.join("\n");
  },

  clear(): void {
    buffer.length = 0;
  },
};
