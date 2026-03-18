import type { SpeechGateway } from "../core/speech/speechGateway";

type BrowserWindow = Window & {
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};

const MAX_ATTEMPTS = 3;
const SILENCE_TIMEOUT_MS = 600;
const RETRY_DELAY_MS = 300;

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
};

function attemptSpeak(text: string, attempt: number): void {
  const synth = window.speechSynthesis;

  // Chrome bug: speechSynthesis gets stuck in paused state after page is idle
  if (synth.paused) {
    synth.resume();
  }

  synth.cancel();

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
      window.setTimeout(() => attemptSpeak(text, attempt + 1), RETRY_DELAY_MS);
    }
  };

  synth.speak(utterance);

  // 無音検知: 一定時間内に onstart が来なければリトライ
  window.setTimeout(() => {
    if (!started && !synth.speaking && attempt < MAX_ATTEMPTS) {
      attemptSpeak(text, attempt + 1);
    }
  }, SILENCE_TIMEOUT_MS);
}
