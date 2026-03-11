import Tts from "react-native-tts";
import type { SpeechGateway } from "../../../../src/core/speech/speechGateway";

export const mobileSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return true;
  },
  speakEnglish(text: string): void {
    // setDefaultLanguage を speak 直前に呼ぶ
    // Android の TTS エンジンは非同期初期化のため、モジュールロード時では言語設定が反映されないことがある
    Tts.setDefaultLanguage("en-US").catch(() => {});
    Tts.stop();
    Tts.speak(text);
  },
};
