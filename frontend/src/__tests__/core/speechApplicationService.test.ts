import { describe, expect, it, vi } from "vitest";
import { createSpeechApplicationService } from "../../core/speech/speechApplicationService";

function makeGateway() {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    speakEnglish: vi.fn(),
    stop: vi.fn(),
  };
}

describe("speechApplicationService", () => {
  it("returns availability from gateway", () => {
    const gateway = makeGateway();
    const service = createSpeechApplicationService(gateway);
    expect(service.canSpeak()).toBe(true);
  });

  it("does not speak when text is empty after trim", () => {
    const gateway = makeGateway();
    const service = createSpeechApplicationService(gateway);
    service.speakEnglish("   ");
    expect(gateway.speakEnglish).not.toHaveBeenCalled();
  });

  it("speaks normalized english text", () => {
    const gateway = makeGateway();
    const service = createSpeechApplicationService(gateway);
    service.speakEnglish("  Reach here.  ");
    expect(gateway.speakEnglish).toHaveBeenCalledWith("Reach here.");
  });

  // ──────────────────────────────────────────────
  // stop() — 音声白画面修正のコアロジック
  // ──────────────────────────────────────────────

  it("stop() delegates to gateway.stop()", () => {
    const gateway = makeGateway();
    const service = createSpeechApplicationService(gateway);
    service.stop();
    expect(gateway.stop).toHaveBeenCalledTimes(1);
  });

  it("stop() can be called even when nothing is playing (no throw)", () => {
    const gateway = makeGateway();
    const service = createSpeechApplicationService(gateway);
    expect(() => service.stop()).not.toThrow();
  });
});
