// frontend/src/api/io.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportData, importData } from '../../api/io';
import { api } from '../../api/client';
import type { AppData } from '../../api/types';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  tokenManager: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    onUnauthorized: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

describe('io API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportData', () => {
    it('should call GET /io/export and return AppData', async () => {
      const mockData: AppData = {
        schemaVersion: 2,
        exportedAt: '2024-01-01T00:00:00Z',
        words: [
          {
            id: '1',
            headword: 'test',
            pronunciation: undefined,
            entries: [{ pos: 'noun', meanings: [{ meaningJa: 'テスト', tags: [], examples: [] }] }],
            memo: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ],
        memory: [],
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await exportData();

      expect(api.get).toHaveBeenCalledWith('/io/export');
      expect(result).toEqual(mockData);
    });

    it('should throw error if export fails', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Export failed'));

      await expect(exportData()).rejects.toThrow('Export failed');
    });
  });

  describe('importData', () => {
    const mockAppData: AppData = {
      schemaVersion: 1,
      exportedAt: '2024-01-01T00:00:00Z',
      words: [],
      memory: [],
    };

    it('should call POST /io/import with merge mode by default', async () => {
      vi.mocked(api.post).mockResolvedValue({ ok: true });

      await importData(mockAppData);

      expect(api.post).toHaveBeenCalledWith('/io/import?mode=merge', mockAppData);
    });

    it('should call POST /io/import with overwrite mode when specified', async () => {
      vi.mocked(api.post).mockResolvedValue({ ok: true });

      await importData(mockAppData, 'overwrite');

      expect(api.post).toHaveBeenCalledWith('/io/import?mode=overwrite', mockAppData);
    });

    it('should throw error if import fails', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Import failed'));

      await expect(importData(mockAppData)).rejects.toThrow('Import failed');
    });
  });
});
