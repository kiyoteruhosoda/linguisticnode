/**
 * デバッグロガー
 *
 * 【クラッシュ安全性の設計】
 * - log() → 即時 flushToFile() を呼び出す（デバウンスなし）
 * - 並行書き込みは _writing/_needsFlush で直列化
 * - 初回フラッシュ時に前セッションのファイル内容を読み込んで先頭に付加する
 *   → アプリ再起動後もクラッシュ前のログが残る
 * - クリティカルな操作前に await flush() で書き込み完了を保証できる
 */

import * as FileSystem from "expo-file-system";

const MAX_MEMORY_LOGS = 500;
/** 前セッションのログを何文字まで保持するか（約100〜200行分） */
const MAX_PREV_CONTENT_CHARS = 8000;

const buffer: string[] = [];
let _debugMode = true; // 問題解決まで ON がデフォルト
let _writing = false;
let _needsFlush = false;
let _firstFlush = true;
let _previousContent = ""; // 前セッションのログ（初回フラッシュ時に読み込む）

function logFilePath(): string {
  return `${FileSystem.documentDirectory ?? ""}linguisticnode-debug.log`;
}

async function flushToFile(): Promise<void> {
  if (_writing) {
    _needsFlush = true;
    return;
  }
  _writing = true;
  _needsFlush = false;
  try {
    if (_firstFlush) {
      _firstFlush = false;
      // 初回: 前セッションのログをファイルから読み込んで保持する
      try {
        const info = await FileSystem.getInfoAsync(logFilePath());
        if (info.exists) {
          let prev = await FileSystem.readAsStringAsync(logFilePath(), {
            encoding: FileSystem.EncodingType.UTF8,
          });
          if (prev.length > MAX_PREV_CONTENT_CHARS) {
            prev = `...(前セッションログ省略)\n` + prev.slice(-MAX_PREV_CONTENT_CHARS);
          }
          _previousContent = prev.trim() + "\n--- NEW SESSION ---\n";
        }
      } catch {
        /* 読み込み失敗は無視 */
      }
    }
    const content = _previousContent + buffer.join("\n") + "\n";
    await FileSystem.writeAsStringAsync(logFilePath(), content, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    /* ファイル書き込み失敗は無視 */
  } finally {
    _writing = false;
    if (_needsFlush) void flushToFile();
  }
}

export const debugLogger = {
  setDebugMode(enabled: boolean): void {
    _debugMode = enabled;
    if (!enabled) {
      _previousContent = "";
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

  /**
   * クリティカルな操作（TTS など）の前に呼んでファイル書き込み完了を保証する。
   * クラッシュが起きてもこの await が返った後なら直前のログが残る。
   */
  async flush(): Promise<void> {
    if (!_debugMode) return;
    // 書き込み中なら完了を待つ
    while (_writing) {
      await new Promise<void>((r) => setTimeout(r, 10));
    }
    // バッファに未書き込みがあれば書き込む
    await flushToFile();
    // flushToFile が _needsFlush を処理するのを待つ
    while (_writing) {
      await new Promise<void>((r) => setTimeout(r, 10));
    }
  },

  getLogs(): string {
    return buffer.join("\n");
  },

  getLogFilePath(): string {
    return logFilePath();
  },

  async clearLogs(): Promise<void> {
    buffer.length = 0;
    _previousContent = "";
    _firstFlush = true;
    await FileSystem.deleteAsync(logFilePath(), { idempotent: true }).catch(() => {});
  },
};
