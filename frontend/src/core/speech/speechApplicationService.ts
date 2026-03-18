import type { SpeechGateway } from "./speechGateway";

export function createSpeechApplicationService(gateway: SpeechGateway) {
  return {
    canSpeak(): boolean {
      return gateway.isAvailable();
    },
    speakEnglish(text: string): Promise<void> {
      const normalized = text.trim();
      if (!normalized) {
        return Promise.resolve();
      }
      return gateway.speakEnglish(normalized);
    },
  };
}

export type SpeechApplicationService = ReturnType<typeof createSpeechApplicationService>;
