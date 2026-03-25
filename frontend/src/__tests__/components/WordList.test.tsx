// frontend/src/components/WordList.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordList } from '../../components/WordList';
import type { WordEntry } from '../../api/types';

describe('WordList', () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  const mockWords: WordEntry[] = [
    {
      id: '1',
      headword: 'hello',
      pronunciation: undefined,
      entries: [{ pos: 'noun', meanings: [{ meaningJa: 'こんにちは', tags: [], examples: [] }] }],
      memo: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      headword: 'world',
      pronunciation: undefined,
      entries: [{ pos: 'noun', meanings: [{ meaningJa: '世界', tags: [], examples: [] }] }],
      memo: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no words', () => {
    render(<WordList items={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('No words yet. Add one above.')).toBeInTheDocument();
  });

  it('should render word list with all words', () => {
    render(<WordList items={mockWords} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(screen.getByText('こんにちは')).toBeInTheDocument();
    expect(screen.getByText('世界')).toBeInTheDocument();
  });

  it('should display item count', () => {
    render(<WordList items={mockWords} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText('2 items')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', () => {
    render(<WordList items={mockWords} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockWords[0]);
  });

  it('should call onDelete when delete button is clicked', () => {
    render(<WordList items={mockWords} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('should render POS badges', () => {
    render(<WordList items={mockWords} onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const nounBadges = screen.getAllByText('noun');
    expect(nounBadges).toHaveLength(2);
  });
});
