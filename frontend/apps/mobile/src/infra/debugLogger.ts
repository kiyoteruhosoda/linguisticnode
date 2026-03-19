/**
 * デバッグロガー
 *
 * - 常にインメモリバッファ（最大 MAX_MEMORY_LOGS 行）に記録する
 * - debugMode が ON の場合はクラッシュ後も参照できるようファイルにも書き込む
 *   （デフォルト ON：音声白画面問題が解決するまで）
 * - ファイル書き込みは非同期・fire-and-forget で行い UI をブロックしない
 */

import * as FileSystem from "expo-file-system";

const MAX_MEMORY_LOGS = 1000;
const FLUSH_DEBOUNCE_MS = 300;

const buffer: string[] = [];
let _debugMode = true; // 問題解決まで ON がデフォルト
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function logFilePath(): string {
  return `${FileSystem.documentDirectory ?? ""}linguisticnode-debug.log`;
}

function scheduleFlush(): void {
  if (_flushTimer !== null) clearTimeout(_flushTimer);
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    const content = buffer.join("\n") + "\n";
    void FileSystem.writeAsStringAsync(logFilePath(), content, {
      encoding: FileSystem.EncodingType.UTF8,
    }).catch(() => {/* ファイル書き込み失敗は無視 */});
  }, FLUSH_DEBOUNCE_MS);
}

export const debugLogger = {
  setDebugMode(enabled: boolean): void {
    _debugMode = enabled;
    if (!enabled) {
      // 無効化時はファイルを削除して古いログが残らないようにする
      void FileSystem.deleteAsync(logFilePath(), { idempotent: true }).catch(() => {});
    } else {
      // 有効化時は現在のバッファをすぐにファイルへ書き出す
      scheduleFlush();
    }
  },

  isDebugMode(): boolean {
    return _debugMode;
  },

  log(tag: string, message: string): void {
    const line = `${new Date().toISOString()} [${tag}] ${message}`;
    if (buffer.length >= MAX_MEMORY_LOGS) buffer.shift();
    buffer.push(line);
    if (_debugMode) scheduleFlush();
  },

  getLogs(): string {
    return buffer.join("\n");
  },

  /** debug mode ON 時に共有すべきファイルパス */
  getLogFilePath(): string {
    return logFilePath();
  },

  async clearLogs(): Promise<void> {
    buffer.length = 0;
    await FileSystem.deleteAsync(logFilePath(), { idempotent: true }).catch(() => {});
  },
};
