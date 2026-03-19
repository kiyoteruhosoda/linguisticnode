/**
 * デバッグロガー
 *
 * - 常にインメモリバッファ（最大 MAX_MEMORY_LOGS 行）に記録する
 * - debugMode が ON の場合はクラッシュ後も参照できるようファイルにも書き込む
 *   （デフォルト ON：音声白画面問題が解決するまで）
 *
 * 【クラッシュ安全性】
 *   デバウンスなしで毎回即時書き込みする。
 *   書き込み中に次のログが来た場合は _needsFlush フラグを立て、
 *   現在の書き込み完了後に続けて書き込む（並行書き込みによる破損を防止）。
 */

import * as FileSystem from "expo-file-system";

const MAX_MEMORY_LOGS = 1000;

const buffer: string[] = [];
let _debugMode = true; // 問題解決まで ON がデフォルト
let _writing = false;
let _needsFlush = false;

function logFilePath(): string {
  return `${FileSystem.documentDirectory ?? ""}linguisticnode-debug.log`;
}

async function flushToFile(): Promise<void> {
  if (_writing) {
    // 書き込み中なら完了後にもう一度書き込むようフラグを立てる
    _needsFlush = true;
    return;
  }
  _writing = true;
  _needsFlush = false;
  try {
    const content = buffer.join("\n") + "\n";
    await FileSystem.writeAsStringAsync(logFilePath(), content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    /* ファイル書き込み失敗は無視 */
  } finally {
    _writing = false;
    if (_needsFlush) {
      // 書き込み中に積まれたログをフラッシュ
      void flushToFile();
    }
  }
}

export const debugLogger = {
  setDebugMode(enabled: boolean): void {
    _debugMode = enabled;
    if (!enabled) {
      void FileSystem.deleteAsync(logFilePath(), { idempotent: true }).catch(() => {});
    } else {
      void flushToFile();
    }
  },

  isDebugMode(): boolean {
    return _debugMode;
  },

  log(tag: string, message: string): void {
    const line = `${new Date().toISOString()} [${tag}] ${message}`;
    if (buffer.length >= MAX_MEMORY_LOGS) buffer.shift();
    buffer.push(line);
    if (_debugMode) void flushToFile();
  },

  getLogs(): string {
    return buffer.join("\n");
  },

  getLogFilePath(): string {
    return logFilePath();
  },

  async clearLogs(): Promise<void> {
    buffer.length = 0;
    await FileSystem.deleteAsync(logFilePath(), { idempotent: true }).catch(() => {});
  },
};
