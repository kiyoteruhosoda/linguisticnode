// src/api/words.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wordsApi } from '../../api/words';
import * as client from '../../api/client';
import type { Pos } from '../../api/types';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
  tokenManager: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    onUnauthorized: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

describe('Words API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of words', async () => {
      const mockWords = [
        { id: '1', headword: 'hello', pronunciation: undefined, entries: [{ pos: 'noun' as Pos, meanings: [{ meaningJa: 'こんにちは', tags: [], examples: [] }] }], memo: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        { id: '2', headword: 'world', pronunciation: undefined, entries: [{ pos: 'noun' as Pos, meanings: [{ meaningJa: '世界', tags: [], examples: [] }] }], memo: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
      ];
      const mockMemoryMap = {};
      vi.mocked(client.api.get).mockResolvedValueOnce({ ok: true, words: mockWords, memoryMap: mockMemoryMap });

      const result = await wordsApi.list();
      expect(result).toEqual({ words: mockWords, memoryMap: mockMemoryMap });
      expect(client.api.get).toHaveBeenCalledWith('/words');
    });
  });

  describe('create', () => {
    it('should create new word', async () => {
      const newWord = { headword: 'apple', pronunciation: undefined, entries: [{ pos: 'noun' as Pos, meanings: [{ meaningJa: 'りんご', tags: [], examples: [] }] }], memo: null };
      const mockCreated = { id: '999', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', ...newWord };
      vi.mocked(client.api.post).mockResolvedValueOnce({ ok: true, word: mockCreated });

      const result = await wordsApi.create(newWord);
      expect(result).toEqual(mockCreated);
      expect(client.api.post).toHaveBeenCalledWith('/words', newWord);
    });
  });

  describe('update', () => {
    it('should update existing word', async () => {
      const updates = { headword: 'update', pronunciation: undefined, entries: [{ pos: 'verb' as Pos, meanings: [{ meaningJa: '更新されました', tags: [], examples: [] }] }], memo: null };
      const mockUpdated = { id: '111', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z', ...updates };
      vi.mocked(client.api.put).mockResolvedValueOnce({ ok: true, word: mockUpdated });

      const result = await wordsApi.update('111', updates);
      expect(result).toEqual(mockUpdated);
      expect(client.api.put).toHaveBeenCalledWith('/words/111', updates);
    });
  });

  describe('delete', () => {
    it('should delete word', async () => {
      vi.mocked(client.api.del).mockResolvedValueOnce({ ok: true });

      await wordsApi.delete('222');
      expect(client.api.del).toHaveBeenCalledWith('/words/222');
    });
  });
});
