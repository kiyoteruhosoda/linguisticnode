import type { SpeechGateway } from "../core/speech/speechGateway";

type BrowserWindow = Window & {
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};

const MAX_ATTEMPTS = 3;
const SILENCE_TIMEOUT_MS = 600;
const RETRY_DELAY_MS = 300;

// アンマウント後に孤立したリトライタイマーが新画面で発火しないよう追跡する
const pendingTimers = new Set<ReturnType<typeof window.setTimeout>>();

export const webSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    const browserWindow = window as BrowserWindow;
    return typeof browserWindow.SpeechSynthesisUtterance !== "undefined" && "speechSynthesis" in window;
  },
  speakEnglish(text: string): Promise<void> {
    if (!this.isAvailable()) {
      return Promise.resolve();
    }
    attemptSpeak(text, 1);
    return Promise.resolve();
  },
  stop(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // 孤立リトライタイマーをすべてキャンセルしてから音声を止める
    for (const id of pendingTimers) {
      window.clearTimeout(id);
    }
    pendingTimers.clear();
    window.speechSynthesis.cancel();
  },
};

function attemptSpeak(text: string, attempt: number): void {
  const synth = window.speechSynthesis;

  // Chrome bug: speechSynthesis gets stuck in paused state after page is idle
  if (synth.paused) {
    synth.resume();
  }

  // Only cancel if something is currently playing to avoid unnecessary audio session resets on mobile
  if (synth.speaking || synth.pending) {
    synth.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";

  let started = false;

  utterance.onstart = () => {
    started = true;
  };

  utterance.onerror = (e) => {
    // "interrupted" / "canceled" は cancel() による正常停止なので無視
    if (e.error === "interrupted" || e.error === "canceled") return;
    if (attempt < MAX_ATTEMPTS) {
      const id = window.setTimeout(() => {
        pendingTimers.delete(id);
        attemptSpeak(text, attempt + 1);
      }, RETRY_DELAY_MS);
      pendingTimers.add(id);
    }
  };

  synth.speak(utterance);

  // 無音検知: 一定時間内に onstart が来なければリトライ
  const silenceId = window.setTimeout(() => {
    pendingTimers.delete(silenceId);
    if (!started && !synth.speaking && attempt < MAX_ATTEMPTS) {
      attemptSpeak(text, attempt + 1);
    }
  }, SILENCE_TIMEOUT_MS);
  pendingTimers.add(silenceId);
}
