import type { SpeechGateway } from "../core/speech/speechGateway";

type BrowserWindow = Window & {
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
};

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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return Promise.resolve();
  },
};
