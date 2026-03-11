import { describe, expect, it, vi, afterEach } from "vitest";
import { createMobileSyncGateway } from "../../../apps/mobile/src/infra/mobileSyncGateway";
import type { MobileLearningRepositoryPort } from "../../../apps/mobile/src/domain/mobileLearningRepository.types";
import type { ConflictResolution, VocabFile } from "../../db/types";
import type { MemoryState } from "../../api/types";

function createMockFile(): VocabFile {
  return {
    schemaVersion: 1,
    updatedAt: "2026-01-01T00:00:00.000Z",
    words: [],
    memory: [],
  };
}

function createRepositoryMock(): MobileLearningRepositoryPort {
  const state: { serverRev: number; dirty: boolean; lastSyncAt: string | null } = {
    serverRev: 1,
    dirty: true,
    lastSyncAt: null,
  };

  return {
    listWords: vi.fn(),
    getWord: vi.fn(),
    createWord: vi.fn(),
    updateWord: vi.fn(),
    deleteWord: vi.fn(),
    resetMemory: vi.fn(),
    listTags: vi.fn(),
    nextCard: vi.fn(),
    gradeCard: vi.fn((): MemoryState => ({
      wordId: "w-1",
      memoryLevel: 0,
      ease: 2.5,
      intervalDays: 1,
      dueAt: "2026-01-01T00:00:00.000Z",
      lastRating: null,
      lastReviewedAt: null,
      lapseCount: 0,
      reviewCount: 0,
    })),
    getSyncStatus: vi.fn(() => ({
      online: true,
      dirty: state.dirty,
      lastSyncAt: state.lastSyncAt,
      clientId: "mobile-local-client",
      serverRev: state.serverRev,
    })),
    exportVocabFile: vi.fn(() => createMockFile()),
    importVocabFile: vi.fn(),
    applyServerFile: vi.fn((_file: VocabFile, serverRev: number, syncedAt: string) => {
      state.serverRev = serverRev;
      state.lastSyncAt = syncedAt;
      state.dirty = false;
    }),
    markSynced: vi.fn((serverRev: number, syncedAt: string) => {
      state.serverRev = serverRev;
      state.lastSyncAt = syncedAt;
      state.dirty = false;
    }),
    sync: vi.fn(),
    resolveConflict: vi.fn((strategy: ConflictResolution) => ({
      status: "success" as const,
      serverRev: strategy === "force-local" ? 2 : 1,
      updatedAt: "2026-01-01T00:01:00.000Z",
    })),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createMobileSyncGateway", () => {
  it("falls back to local sync when remote config is not provided", async () => {
    const repository = createRepositoryMock();
    const gateway = createMobileSyncGateway(repository);

    expect(await gateway.getSyncStatus()).toMatchObject({ serverRev: 1 });
  });

  it("returns conflict payload on 409 and can resolve with fetch-server", async () => {
    const repository = createRepositoryMock();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 409 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverRev: 9,
          updatedAt: "2026-01-01T02:00:00.000Z",
          updatedByClientId: "server",
          file: createMockFile(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          serverRev: 9,
          updatedAt: "2026-01-01T02:00:00.000Z",
          updatedByClientId: "server",
          file: createMockFile(),
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const gateway = createMobileSyncGateway(repository, {
      apiBaseUrl: "http://localhost:8000",
      accessToken: "token",
      clientId: "mobile-test",
    });

    const syncResult = await gateway.syncToServer();
    expect(syncResult.status).toBe("conflict");

    const resolved = await gateway.resolveConflict("fetch-server");
    expect(resolved.status).toBe("success");
    expect(repository.applyServerFile).toHaveBeenCalled();
  });

  it("marks local repository synced on successful upload", async () => {
    const repository = createRepositoryMock();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        serverRev: 3,
        updatedAt: "2026-01-01T03:00:00.000Z",
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const gateway = createMobileSyncGateway(repository, {
      apiBaseUrl: "http://localhost:8000",
      accessToken: "token",
    });

    const result = await gateway.syncToServer();
    expect(result).toMatchObject({ status: "success", serverRev: 3 });
    expect(repository.markSynced).toHaveBeenCalledWith(3, "2026-01-01T03:00:00.000Z");
  });
});
