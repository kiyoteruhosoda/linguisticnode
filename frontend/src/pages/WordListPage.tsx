// frontend/src/pages/WordListPage.tsx

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { wordApplicationService } from "../word/wordApplication";
import type { WordEntry, MemoryState } from "../api/types";
import { RnwImportDialog } from "../rnw/components/RnwImportDialog";
import SyncButton from "../components/SyncButton";
import { backupExportService } from "../io/backupExportApplication";
import { RnwSearchPanel } from "../rnw/components/RnwSearchPanel";
import { RnwWordListTable } from "../rnw/components/RnwWordListTable";
import { RnwInlineNotice } from "../rnw/components/RnwInlineNotice";
import { RnwButton } from "../rnw/components/RnwButton";
import { useTagFilterState } from "../hooks/useTagFilterState";
import { RnwTagFilterPanel } from "../rnw/components/RnwTagFilterPanel";
import { CrossFeatureActionBar } from "../components/CrossFeatureActionBar";
import { RnwPageHeader } from "@linguisticnode/ui";
import pageConfig from "../config/pageConfig.json";

export function WordListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WordEntry[]>([]);
  const [memoryMap, setMemoryMap] = useState<Record<string, MemoryState>>({});
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);

  const {
    selectedTags,
    appliedTags,
    isFilterExpanded,
    setFilterExpanded,
    handleToggleTagSelection,
    applyFilter,
    clearFilter,
  } = useTagFilterState("words");

  const loadTags = useCallback(async () => {
    try {
      const tags = await wordApplicationService.getAllTags();
      setAllTags(tags);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  }, []);

  const reload = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await wordApplicationService.listWords({ q, tags: appliedTags });
      setItems(result.items);
      setMemoryMap(result.memoryMap);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [appliedTags, q]);

  useEffect(() => {
    void loadTags();
    void reload();
  }, [loadTags, reload]);

  useEffect(() => {
    void reload();
  }, [appliedTags, reload]);

  async function handleExport() {
    setError(null);
    setBusy(true);
    try {
      const data = await wordApplicationService.exportSnapshot();
      backupExportService.exportBackup(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  function handleImportSuccess() {
    void loadTags();
    void reload();
  }

  return (
    <div className="vstack gap-3" data-testid="word-list-page-ready">
      <RnwPageHeader
        title={pageConfig.pages.words.title}
        icon={<i className={pageConfig.pages.words.iconClass} aria-hidden="true" />}
        testID={pageConfig.pages.words.testID}
      />
      <CrossFeatureActionBar
        current="words"
        onNavigate={(target) => navigate(`/${target}`)}
        tagFilter={{
          allTagCount: allTags.length,
          activeCount: appliedTags?.length ?? 0,
          onToggle: () => setFilterExpanded(!isFilterExpanded),
          testID: "rnw-word-list-tags",
        }}
        extraLeading={
          <>
            <RnwButton
              label="Add"
              onPress={() => navigate("/words/create")}
              icon={<i className="fa-solid fa-plus" aria-hidden="true" />}
              testID="rnw-add-button"
              kind="solid"
              tone="primary"
            />

            <RnwButton
              onPress={() => setShowSearch(!showSearch)}
              icon={<i className="fa-solid fa-magnifying-glass" aria-hidden="true" />}
              title="Toggle search"
              testID="rnw-toggle-search-button"
              kind="outline"
              tone="secondary"
            />

            <div className="d-none d-md-flex gap-2">
              <RnwButton
                label="Export"
                onPress={() => void handleExport()}
                disabled={busy}
                icon={<i className="fa-solid fa-upload" aria-hidden="true" />}
                testID="rnw-export-button"
                kind="outline"
                tone="secondary"
                size="sm"
              />

              <RnwButton
                label="Import"
                onPress={() => setShowImportModal(true)}
                disabled={busy}
                icon={<i className="fa-solid fa-download" aria-hidden="true" />}
                testID="rnw-import-button"
                kind="outline"
                tone="secondary"
                size="sm"
              />
            </div>
          </>
        }
        trailing={<SyncButton onSyncSuccess={() => { void loadTags(); void reload(); }} />}
        testID="rnw-word-list-action-row"
      />

      {isFilterExpanded && allTags.length > 0 && (
        <RnwTagFilterPanel
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTagSelection}
          onClose={() => setFilterExpanded(false)}
          onClear={clearFilter}
          onApply={applyFilter}
        />
      )}

      {showSearch && (
        <RnwSearchPanel
          value={q}
          busy={busy}
          onChange={setQ}
          onSubmit={() => void reload()}
          onClear={() => {
            setQ("");
            setShowSearch(false);
            void reload();
          }}
        />
      )}

      {error ? (
        <RnwInlineNotice
          tone="error"
          message={error}
          icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
        />
      ) : null}

      {items.length === 0 ? (
        <RnwInlineNotice
          tone="info"
          message="No words yet. Click 'Add' to create one."
          icon={<i className="fa-solid fa-circle-info" aria-hidden="true" />}
        />
      ) : (
        <RnwWordListTable
          items={items}
          memoryMap={memoryMap}
          onSelectWord={(wordId) => navigate(`/words/${wordId}`)}
        />
      )}

      <RnwImportDialog
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
