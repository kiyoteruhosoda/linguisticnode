import { describe, expect, it } from "vitest";
import appSource from "../../../apps/mobile/App.tsx?raw";

// The sync server was retired on 2026-10-17, so the phone app must not offer
// a way into sync (task #465). App.tsx pulls in React Native, which does not
// load under vitest, so this reads the app shell as text.
describe("mobile app shell", () => {
  it("has the words, cards, fill and settings tabs only", () => {
    expect(appSource).toContain('type MobileRoute = "words" | "study" | "quiz" | "data";');
  });

  it("does not mount the sync screen", () => {
    expect(appSource).not.toMatch(/import\s*\{\s*SyncScreen\s*\}/);
    expect(appSource).not.toMatch(/<SyncScreen\b/);
  });
});
