import Tts from "react-native-tts";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

// Whether TTS is currently speaking — used to avoid unnecessary Tts.stop() calls.
// Calling stop() when nothing is playing can reset the iOS audio session and cause
// a blank screen on some devices.
let ttsActive = false;

export const mobileSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return true;
  },
  async speakEnglish(text: string): Promise<void> {
    try {
      await Tts.setDefaultLanguage("en-US");
    } catch {
      // language setting failed, proceed anyway
    }

    // Only stop if currently speaking to avoid unnecessary audio session resets
    if (ttsActive) {
      Tts.stop();
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            ttsActive = false;
            Tts.removeEventListener("tts-finish", onFinish);
            Tts.removeEventListener("tts-error", onError);
            Tts.removeEventListener("tts-cancel", onCancel);
          };
          const onFinish = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error("TTS error")); };
          // tts-cancel fires when stop() is called intentionally → resolve cleanly
          const onCancel = () => { cleanup(); resolve(); };

          Tts.addEventListener("tts-finish", onFinish);
          Tts.addEventListener("tts-error", onError);
          Tts.addEventListener("tts-cancel", onCancel);
          ttsActive = true;
          Tts.speak(text);
        });
        return; // success
      } catch {
        ttsActive = false;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }
  },
  stop(): void {
    if (ttsActive) {
      Tts.stop();
      // ttsActive will be reset to false by the tts-cancel handler above
    }
  },
};
