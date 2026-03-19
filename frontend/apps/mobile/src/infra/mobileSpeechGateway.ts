import Tts from "react-native-tts";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";
import { debugLogger } from "./debugLogger";

const TAG = "TTS";
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
    debugLogger.log(TAG, `speakEnglish start: "${text.slice(0, 40)}" ttsActive=${ttsActive}`);
    // クラッシュ前にログが確実にファイルに書き込まれるよう flush を待つ
    await debugLogger.flush();

    try {
      await Tts.setDefaultLanguage("en-US");
      debugLogger.log(TAG, "setDefaultLanguage OK");
    } catch (e) {
      debugLogger.log(TAG, `setDefaultLanguage failed: ${String(e)}`);
    }
    await debugLogger.flush();

    // Only stop if currently speaking to avoid unnecessary audio session resets
    if (ttsActive) {
      debugLogger.log(TAG, "stopping previous speech before new speak");
      Tts.stop();
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      debugLogger.log(TAG, `attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      // Tts.speak() でクラッシュしてもこのログがファイルに残るよう先に flush する
      await debugLogger.flush();
      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            ttsActive = false;
            Tts.removeEventListener("tts-finish", onFinish);
            Tts.removeEventListener("tts-error", onError);
            Tts.removeEventListener("tts-cancel", onCancel);
          };
          const onFinish = () => {
            debugLogger.log(TAG, "tts-finish");
            cleanup();
            resolve();
          };
          const onError = (e: unknown) => {
            debugLogger.log(TAG, `tts-error: ${JSON.stringify(e)}`);
            cleanup();
            reject(new Error("TTS error"));
          };
          const onCancel = () => {
            debugLogger.log(TAG, "tts-cancel (stop called intentionally)");
            cleanup();
            resolve();
          };

          Tts.addEventListener("tts-finish", onFinish);
          Tts.addEventListener("tts-error", onError);
          Tts.addEventListener("tts-cancel", onCancel);
          ttsActive = true;
          debugLogger.log(TAG, "Tts.speak() called");
          Tts.speak(text);
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
      Tts.stop();
      // ttsActive will be reset to false by the tts-cancel handler
    }
  },
};
