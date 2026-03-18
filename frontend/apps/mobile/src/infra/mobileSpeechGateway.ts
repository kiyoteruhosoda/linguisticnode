import Tts from "react-native-tts";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

export const mobileSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return true;
  },
  async speakEnglish(text: string): Promise<void> {
    // setDefaultLanguage を speak 直前に await することで
    // Android の TTS エンジン非同期初期化タイミング問題を防ぐ
    try {
      await Tts.setDefaultLanguage("en-US");
    } catch {
      // language setting failed, proceed anyway
    }
    Tts.stop();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const onFinish = () => {
            Tts.removeEventListener("tts-finish", onFinish);
            Tts.removeEventListener("tts-error", onError);
            resolve();
          };
          const onError = (e: { utteranceId?: string; error?: string }) => {
            Tts.removeEventListener("tts-finish", onFinish);
            Tts.removeEventListener("tts-error", onError);
            reject(new Error(e.error ?? "TTS error"));
          };
          Tts.addEventListener("tts-finish", onFinish);
          Tts.addEventListener("tts-error", onError);
          Tts.speak(text);
        });
        return; // success
      } catch {
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          Tts.stop();
        }
      }
    }
  },
};
