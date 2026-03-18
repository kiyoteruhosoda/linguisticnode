import type { SpeechGateway } from "../core/speech/speechGateway";

export const noopSpeechGateway: SpeechGateway = {
  isAvailable(): boolean {
    return false;
  },
  speakEnglish(): Promise<void> {
    return Promise.resolve();
  },
  stop(): void {
    // noop
  },
};
