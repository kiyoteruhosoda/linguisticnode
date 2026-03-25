// frontend/src/components/FlashCard.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FlashCard } from '../../components/FlashCard';
import type { WordEntry, MemoryState } from '../../api/types';

// Mock SpeechSynthesisUtterance for test environment
beforeEach(() => {
  if (typeof window !== 'undefined') {
    if (!window.SpeechSynthesisUtterance) {
      (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
        constructor() {
          // Mock constructor
        }
        lang = 'en-US';
      };
    }
    if (!window.speechSynthesis) {
      type SpeechSynthesisMock = {
        speak: ReturnType<typeof vi.fn>;
        cancel: ReturnType<typeof vi.fn>;
      };
      (window as unknown as { speechSynthesis: SpeechSynthesisMock }).speechSynthesis = {
        speak: vi.fn(),
        cancel: vi.fn(),
      };
    }
  }
});

describe('FlashCard', () => {
  const mockOnRate = vi.fn();

  const mockWord: WordEntry = {
    id: '1',
    headword: 'hello',
    pronunciation: undefined,
    entries: [
      {
        pos: 'noun',
        meanings: [
          {
            meaningJa: 'こんにちは',
            tags: [],
            examples: [
              { id: '1', en: 'Hello, world!', ja: 'こんにちは、世界！', source: null },
            ],
          },
        ],
      },
    ],
    memo: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockMemory: MemoryState = {
    wordId: '1',
    memoryLevel: 3,
    ease: 2.5,
    intervalDays: 7,
    dueAt: '2024-01-08T00:00:00Z',
    lastRating: 'good',
    lastReviewedAt: '2024-01-01T00:00:00Z',
    lapseCount: 0,
    reviewCount: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock speechSynthesis
    global.window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    } as unknown as SpeechSynthesis;
  });

  it('should render flash card with word', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('noun')).toBeInTheDocument();
    expect(screen.getByText('Lv 3')).toBeInTheDocument();
  });

  it('should show answer button initially', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    expect(screen.getByText('Show Answer')).toBeInTheDocument();
    expect(screen.queryByText('こんにちは')).not.toBeInTheDocument();
  });

  it('should show answer and rating buttons when Show Answer is clicked', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    fireEvent.click(screen.getByText('Show Answer'));

    expect(screen.getAllByText('こんにちは').length).toBeGreaterThan(0);
    expect(screen.getByText('Again')).toBeInTheDocument();
    expect(screen.getByText('Hard')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('should show example sentence when available', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    fireEvent.click(screen.getByText('Show Answer'));

    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    expect(screen.getByText('こんにちは、世界！')).toBeInTheDocument();
  });

  it('should not show example section when no examples', () => {
    const wordWithoutExamples = { ...mockWord, entries: [{ pos: 'noun' as const, meanings: [{ meaningJa: 'こんにちは', tags: [], examples: [] }] }] };
    render(<FlashCard word={wordWithoutExamples} memory={mockMemory} onRate={mockOnRate} />);

    fireEvent.click(screen.getByText('Show Answer'));

    expect(screen.queryByText('Example')).not.toBeInTheDocument();
  });

  it('should call onRate with correct rating when button is clicked', async () => {
    mockOnRate.mockResolvedValue(undefined);

    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    fireEvent.click(screen.getByText('Show Answer'));
    fireEvent.click(screen.getByText('Good'));

    await waitFor(() => {
      expect(mockOnRate).toHaveBeenCalledWith('good');
    });
  });

  it('should call speech synthesis when speak button is clicked', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    const speakButton = screen.getAllByTitle('Speak')[0];
    fireEvent.click(speakButton);

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should speak example when example speak button is clicked', () => {
    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    fireEvent.click(screen.getByText('Show Answer'));

    const speakExampleButton = screen.getByTitle('Speak example');
    fireEvent.click(speakExampleButton);

    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('should handle all rating options', async () => {
    mockOnRate.mockResolvedValue(undefined);

    render(<FlashCard word={mockWord} memory={mockMemory} onRate={mockOnRate} />);

    const ratings: Array<[string, 'again' | 'hard' | 'good' | 'easy']> = [
      ['Again', 'again'],
      ['Hard', 'hard'],
      ['Good', 'good'],
      ['Easy', 'easy'],
    ];

    for (const [buttonText, rating] of ratings) {
      // Show answer before each rating
      fireEvent.click(screen.getByText('Show Answer'));
      
      fireEvent.click(screen.getByText(buttonText));
      await waitFor(() => {
        expect(mockOnRate).toHaveBeenCalledWith(rating);
      });
      mockOnRate.mockClear();
    }
  });
});
