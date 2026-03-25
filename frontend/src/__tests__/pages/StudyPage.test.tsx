// src/__tests__/pages/StudyPage.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StudyPage } from '../../pages/StudyPage';
import { AuthProvider } from '../../auth/AuthContext';
import * as studyOffline from '../../api/study.offline';

vi.mock('../../api/study.offline', () => ({
  studyApi: {
    next: vi.fn(),
    grade: vi.fn(),
    getTags: vi.fn(),
  },
}));

vi.mock('../../api/auth', () => ({
  authApi: {
    me: vi.fn(),
    logout: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    status: vi.fn(),
  },
}));

vi.mock('../../api/client', () => ({
  tokenManager: {
    setToken: vi.fn(),
    clearToken: vi.fn(),
    onUnauthorized: vi.fn(),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    setUserId: vi.fn(),
  },
}));

describe('StudyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display success message when no cards available', async () => {
    vi.mocked(studyOffline.studyApi.getTags).mockResolvedValue({ ok: true, tags: [] });
    vi.mocked(studyOffline.studyApi.next).mockResolvedValue({ ok: true, card: null });

    render(
      <MemoryRouter>
        <AuthProvider>
          <StudyPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Study complete\./i)).toBeInTheDocument();
    });
  });

  it('should display word card when available', async () => {
    const mockCard = {
      word: {
        id: 'w1',
        headword: 'vocabulary',
        pronunciation: undefined,
        entries: [{ pos: 'noun' as const, meanings: [{ meaningJa: '語彙', tags: [], examples: [] }] }],
        memo: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      memory: {
        wordId: 'w1',
        dueAt: '2024-01-01T00:00:00Z',
        memoryLevel: 1,
        ease: 2.5,
        intervalDays: 1,
        reviewCount: 0,
        lapseCount: 0,
        lastRating: null,
        lastReviewedAt: null,
      },
    };

    vi.mocked(studyOffline.studyApi.getTags).mockResolvedValue({ ok: true, tags: [] });
    vi.mocked(studyOffline.studyApi.next).mockResolvedValue({ ok: true, card: mockCard });

    render(
      <MemoryRouter>
        <AuthProvider>
          <StudyPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('vocabulary')).toBeInTheDocument();
    });
  });

  it('should display error message on API failure', async () => {
    vi.mocked(studyOffline.studyApi.getTags).mockResolvedValue({ ok: true, tags: [] });
    vi.mocked(studyOffline.studyApi.next).mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <AuthProvider>
          <StudyPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it('uses query wordId as preferred card source', async () => {
    const mockCard = {
      word: {
        id: 'w99',
        headword: 'anchor',
        pronunciation: undefined,
        entries: [{ pos: 'noun' as const, meanings: [{ meaningJa: '錨', tags: [], examples: [] }] }],
        memo: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      memory: {
        wordId: 'w99',
        dueAt: '2024-01-01T00:00:00Z',
        memoryLevel: 1,
        ease: 2.5,
        intervalDays: 1,
        reviewCount: 0,
        lapseCount: 0,
        lastRating: null,
        lastReviewedAt: null,
      },
    };

    vi.mocked(studyOffline.studyApi.getTags).mockResolvedValue({ ok: true, tags: [] });
    vi.mocked(studyOffline.studyApi.next).mockResolvedValue({ ok: true, card: mockCard });

    render(
      <MemoryRouter initialEntries={['/study?wordId=w99']}>
        <AuthProvider>
          <StudyPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(studyOffline.studyApi.next).toHaveBeenCalledWith(undefined, 'w99');
    });
  });


  it('consumes preferred wordId only on first fetch', async () => {
    const user = userEvent.setup();
    const firstCard = {
      word: {
        id: 'w99',
        headword: 'anchor',
        pronunciation: undefined,
        entries: [{ pos: 'noun' as const, meanings: [{ meaningJa: '錨', tags: [], examples: [] }] }],
        memo: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      memory: {
        wordId: 'w99',
        dueAt: '2024-01-01T00:00:00Z',
        memoryLevel: 1,
        ease: 2.5,
        intervalDays: 1,
        reviewCount: 0,
        lapseCount: 0,
        lastRating: null,
        lastReviewedAt: null,
      },
    };

    const nextCard = {
      word: {
        id: 'w100',
        headword: 'bridge',
        pronunciation: undefined,
        entries: [{ pos: 'noun' as const, meanings: [{ meaningJa: '橋', tags: [], examples: [] }] }],
        memo: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      memory: {
        wordId: 'w100',
        dueAt: '2024-01-01T00:00:00Z',
        memoryLevel: 1,
        ease: 2.5,
        intervalDays: 1,
        reviewCount: 0,
        lapseCount: 0,
        lastRating: null,
        lastReviewedAt: null,
      },
    };

    vi.mocked(studyOffline.studyApi.getTags).mockResolvedValue({ ok: true, tags: [] });
    vi.mocked(studyOffline.studyApi.next)
      .mockResolvedValueOnce({ ok: true, card: firstCard })
      .mockResolvedValueOnce({ ok: true, card: nextCard });
    vi.mocked(studyOffline.studyApi.grade).mockResolvedValue({ ok: true, memory: nextCard.memory });

    render(
      <MemoryRouter initialEntries={['/study?wordId=w99']}>
        <AuthProvider>
          <StudyPage />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(studyOffline.studyApi.next).toHaveBeenNthCalledWith(1, undefined, 'w99');
    });

    await user.click(await screen.findByRole('button', { name: 'Show Answer' }));
    await user.click(await screen.findByRole('button', { name: /Again/i }));

    await waitFor(() => {
      expect(studyOffline.studyApi.next).toHaveBeenNthCalledWith(2, undefined, null);
    });
  });
});
