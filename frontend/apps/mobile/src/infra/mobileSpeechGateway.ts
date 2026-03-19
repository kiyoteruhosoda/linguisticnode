import * as Speech from "expo-speech";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";
import { debugLogger } from "./debugLogger";

const TAG = "TTS";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 400;

let ttsActive = false;

export const mobileSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return true;
  },
  async speakEnglish(text: string): Promise<void> {
    debugLogger.log(TAG, `speakEnglish start: "${text.slice(0, 40)}" ttsActive=${ttsActive}`);
    await debugLogger.flush();

    if (ttsActive) {
      debugLogger.log(TAG, "stopping previous speech");
      await Speech.stop();
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      debugLogger.log(TAG, `attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      await debugLogger.flush();
      try {
        await new Promise<void>((resolve, reject) => {
          ttsActive = true;
          debugLogger.log(TAG, "Speech.speak() called");
          Speech.speak(text, {
            language: "en-US",
            onDone: () => {
              debugLogger.log(TAG, "onDone");
              ttsActive = false;
              resolve();
            },
            onError: (error) => {
              debugLogger.log(TAG, `onError: ${String(error)}`);
              ttsActive = false;
              reject(error instanceof Error ? error : new Error(String(error)));
            },
            onStopped: () => {
              debugLogger.log(TAG, "onStopped (stop called intentionally)");
              ttsActive = false;
              resolve();
            },
          });
        });
        debugLogger.log(TAG, "speakEnglish success");
        return;
      } catch (e) {
        debugLogger.log(TAG, `attempt ${attempt + 1} failed: ${String(e)}`);
        ttsActive = false;
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
        }
      }
    }
    debugLogger.log(TAG, "speakEnglish: all attempts failed");
  },
  stop(): void {
    debugLogger.log(TAG, `stop() called ttsActive=${ttsActive}`);
    if (ttsActive) {
      void Speech.stop();
      ttsActive = false;
    }
  },
};
