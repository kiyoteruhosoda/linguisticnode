import * as Speech from "expo-speech";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";

export const mobileSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return true;
  },
  speakEnglish(text: string): void {
    void Speech.stop();
    Speech.speak(text, { language: "en-US" });
  },
};
