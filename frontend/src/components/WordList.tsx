// frontend/src/components/WordList.tsx

import type { WordEntry } from "../api/types";

type Props = {
  items: WordEntry[];
  onEdit: (w: WordEntry) => void;
  onDelete: (id: string) => void;
};

export function WordList({ items, onEdit, onDelete }: Props) {
  return (
    <div className="card shadow-sm">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <i className="fa-solid fa-table-list text-primary" />
          <span className="fw-semibold">Word list</span>
        </div>
        <span className="badge text-bg-light">{items.length} items</span>
      </div>

      <div className="table-responsive">
        <table className="table table-hover mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th>Word</th>
              <th style={{ width: 160 }}>POS</th>
              <th>Meaning</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-secondary py-4">
                  No words yet. Add one above.
                </td>
              </tr>
            ) : (
              items.map((w) => {
                const primaryMeaning = w.entries[0]?.meanings[0]?.meaningJa ?? "";
                return (
                  <tr key={w.id}>
                    <td className="fw-semibold">{w.headword}</td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        {w.entries.map((e) => (
                          <span key={e.pos} className="badge text-bg-secondary">{e.pos}</span>
                        ))}
                      </div>
                    </td>
                    <td>{primaryMeaning}</td>
                    <td>
                      <div className="btn-group btn-group-sm" role="group">
                        <button className="btn btn-outline-primary" onClick={() => onEdit(w)}>
                          <i className="fa-solid fa-pen-to-square me-1" />
                          Edit
                        </button>
                        <button className="btn btn-outline-danger" onClick={() => onDelete(w.id)}>
                          <i className="fa-solid fa-trash me-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
