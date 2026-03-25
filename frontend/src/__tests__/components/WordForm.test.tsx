// frontend/src/components/WordForm.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WordForm } from '../../components/WordForm';
// Mock SpeechSynthesisUtterance
if (typeof window !== 'undefined' && !window.SpeechSynthesisUtterance) {
  type SpeechSynthesisMock = {
    speak: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  (window as unknown as { 
    SpeechSynthesisUtterance: unknown; 
    speechSynthesis: SpeechSynthesisMock 
  }).SpeechSynthesisUtterance = class {
    constructor() {
      // Mock constructor
    }
    lang = 'en-US';
  };
  (window as unknown as { speechSynthesis: SpeechSynthesisMock }).speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
  };
}
import type { WordEntry } from '../../api/types';

describe('WordForm', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render add mode by default', () => {
    render(<WordForm onSave={mockOnSave} />);

    expect(screen.getByText('Add a new word')).toBeInTheDocument();
    expect(screen.getByLabelText('Word')).toBeInTheDocument();
    expect(screen.getByLabelText('POS')).toBeInTheDocument();
    expect(screen.getByLabelText('Meaning (JA)')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('should render edit mode with initial data', () => {
    const initialWord: WordEntry = {
      id: '1',
      headword: 'test',
      pronunciation: undefined,
      entries: [{ pos: 'noun', meanings: [{ meaningJa: 'テスト', tags: [], examples: [{ id: '1', en: 'This is a test', ja: 'これはテストです', source: null }] }] }],
      memo: 'test memo',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(<WordForm initial={initialWord} onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByText('Edit word')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('テスト')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test memo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a test')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSave with form data when submitted', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<WordForm onSave={mockOnSave} />);

    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Meaning (JA)'), { target: { value: 'こんにちは' } });
    
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          headword: 'hello',
          entries: expect.arrayContaining([
            expect.objectContaining({
              pos: 'noun',
              meanings: expect.arrayContaining([
                expect.objectContaining({ meaningJa: 'こんにちは' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  it('should add example sentence when Add Example button is clicked', () => {
    render(<WordForm onSave={mockOnSave} />);

    // Should have one example by default
    const initialExamples = screen.getAllByPlaceholderText('Example sentence in English...');
    expect(initialExamples).toHaveLength(1);

    fireEvent.click(screen.getByText('Add Example'));

    // Should have two examples now
    const examples = screen.getAllByPlaceholderText('Example sentence in English...');
    expect(examples).toHaveLength(2);
  });

  it('should remove example sentence when remove button is clicked', () => {
    render(<WordForm onSave={mockOnSave} />);

    fireEvent.click(screen.getByText('Add Example'));

    const examples = screen.getAllByPlaceholderText('Example sentence in English...');
    expect(examples).toHaveLength(2);

    const removeButtons = screen.getAllByTitle('Remove example');
    fireEvent.click(removeButtons[0]);

    const remainingExamples = screen.getAllByPlaceholderText('Example sentence in English...');
    expect(remainingExamples).toHaveLength(1);
  });

  it('should call onCancel when cancel button is clicked', () => {
    const initialWord: WordEntry = {
      id: '1',
      headword: 'test',
      pronunciation: undefined,
      entries: [{ pos: 'noun', meanings: [{ meaningJa: 'テスト', tags: [], examples: [] }] }],
      memo: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(<WordForm initial={initialWord} onSave={mockOnSave} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should clear form after successful add', async () => {
    mockOnSave.mockResolvedValue(undefined);

    render(<WordForm onSave={mockOnSave} />);

    const wordInput = screen.getByLabelText('Word') as HTMLInputElement;
    const meaningInput = screen.getByLabelText('Meaning (JA)') as HTMLInputElement;

    fireEvent.change(wordInput, { target: { value: 'hello' } });
    fireEvent.change(meaningInput, { target: { value: 'こんにちは' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(wordInput.value).toBe('');
      expect(meaningInput.value).toBe('');
    });
  });

  it('should disable form while saving', async () => {
    let resolveSave: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    mockOnSave.mockReturnValue(savePromise);

    render(<WordForm onSave={mockOnSave} />);

    fireEvent.change(screen.getByLabelText('Word'), { target: { value: 'hello' } });
    fireEvent.change(screen.getByLabelText('Meaning (JA)'), { target: { value: 'こんにちは' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    resolveSave!();

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });
});
