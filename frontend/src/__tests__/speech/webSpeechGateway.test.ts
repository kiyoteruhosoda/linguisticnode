/**
 * webSpeechGateway のユニットテスト
 *
 * 音声再生で白画面になる問題の修正を検証する:
 *   - stop() が speechSynthesis.cancel() を呼ぶこと
 *   - 再生中でない場合は cancel() を呼ばないこと（不要なオーディオセッションリセット防止）
 *   - 再生中/pending の場合は cancel() してから speak() すること
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { webSpeechGateway } from "../../speech/webSpeechGateway";

function makeSynthMock(overrides: Partial<SpeechSynthesis> = {}): SpeechSynthesis {
  return {
    speaking: false,
    pending: false,
    paused: false,
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn().mockReturnValue([]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onvoiceschanged: null,
    ...overrides,
  } as unknown as SpeechSynthesis;
}

beforeEach(() => {
  // SpeechSynthesisUtterance をモック
  (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = class {
    text: string;
    lang = "";
    onstart: (() => void) | null = null;
    onerror: ((e: { error: string }) => void) | null = null;
    constructor(t: string) { this.text = t; }
  };
});

describe("webSpeechGateway.stop()", () => {
  it("stop() は speechSynthesis.cancel() を呼ぶ（音声セッションを解放する）", () => {
    const synth = makeSynthMock();
    window.speechSynthesis = synth;

    webSpeechGateway.stop();

    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("stop() は何も再生していなくてもエラーを投げない", () => {
    const synth = makeSynthMock({ speaking: false, pending: false });
    window.speechSynthesis = synth;

    expect(() => webSpeechGateway.stop()).not.toThrow();
  });

  // P2修正: stop() で孤立リトライタイマーをキャンセルする
  it("stop() を呼ぶと無音検知タイマーが発火してもリトライしない", async () => {
    vi.useFakeTimers();
    const synth = makeSynthMock({ speaking: false, pending: false });
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");
    // タイマーが仕掛けられた直後に stop() を呼ぶ（= ページ遷移）
    webSpeechGateway.stop();

    // 600ms 経過させて無音検知タイマーを発火させる
    await vi.runAllTimersAsync();

    // speak は最初の1回のみ（リトライが発生していない）
    expect(synth.speak).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

describe("webSpeechGateway.speakEnglish() — cancel() の呼び出し条件", () => {
  it("何も再生していないときは cancel() を呼ばない（不要なオーディオセッションリセット防止）", () => {
    const synth = makeSynthMock({ speaking: false, pending: false });
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");

    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("再生中 (speaking=true) のときは cancel() してから speak() する", () => {
    const synth = makeSynthMock({ speaking: true, pending: false });
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");

    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("pending=true のときは cancel() してから speak() する", () => {
    const synth = makeSynthMock({ speaking: false, pending: true });
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");

    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("paused=true のときは resume() してから speak() する（Chrome バグ対応）", () => {
    const synth = makeSynthMock({ paused: true, speaking: false, pending: false });
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");

    expect(synth.resume).toHaveBeenCalledTimes(1);
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it("isAvailable() が false なら speak() を呼ばない", () => {
    // SpeechSynthesisUtterance を消す
    delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
    const synth = makeSynthMock();
    window.speechSynthesis = synth;

    webSpeechGateway.speakEnglish("hello");

    expect(synth.speak).not.toHaveBeenCalled();

    // 復元
    (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance = class {
      text: string;
      lang = ""; onstart = null; onerror = null;
      constructor(t: string) { this.text = t; }
    };
  });
});
