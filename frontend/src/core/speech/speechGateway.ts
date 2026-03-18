export interface SpeechGateway {
  isAvailable(): boolean;
  speakEnglish(text: string): Promise<void>;
}
