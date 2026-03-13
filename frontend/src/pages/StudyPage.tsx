// frontend/src/pages/StudyPage.tsx

import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { studyApplicationService } from "../study/studyApplication";
import type { WordEntry, MemoryState, Rating } from "../api/types";
import { RnwFlashCard } from "../rnw/components/RnwFlashCard";
import SyncButton from "../components/SyncButton";
import { useTagFilterState } from "../hooks/useTagFilterState";
import { RnwTagFilterPanel } from "../rnw/components/RnwTagFilterPanel";
import { RnwInlineNotice } from "../rnw/components/RnwInlineNotice";
import { CrossFeatureActionBar } from "../components/CrossFeatureActionBar";
import { RnwPageHeader } from "@linguisticnode/ui";
import pageConfig from "../config/pageConfig.json";

export function StudyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredWordId = searchParams.get("wordId");
  const preferredWordIdRef = useRef<string | null>(preferredWordId);
  const [word, setWord] = useState<WordEntry | null>(null);
  const [memory, setMemory] = useState<MemoryState | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [allTags, setAllTags] = useState<string[]>([]);
  const {
    selectedTags,
    appliedTags,
    isFilterExpanded,
    setFilterExpanded,
    handleToggleTagSelection,
    applyFilter,
    clearFilter,
  } = useTagFilterState("study");

  const loadTags = useCallback(async () => {
    try {
      const tags = await studyApplicationService.getAllTags();
      setAllTags(tags);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  }, []);

  useEffect(() => {
    preferredWordIdRef.current = preferredWordId;
  }, [preferredWordId]);

  const loadNext = useCallback(async () => {
    setError(null);
    try {
      const preferredWordIdForFetch = preferredWordIdRef.current;
      const card = await studyApplicationService.fetchNextCard(appliedTags, preferredWordIdForFetch);
      if (preferredWordIdForFetch) {
        preferredWordIdRef.current = null;
      }

      if (!card) {
        setWord(null);
        setMemory(null);
      } else {
        setWord(card.word);
        setMemory(card.memory);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [appliedTags]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    void loadNext();
  }, [loadNext]);

  async function rate(rating: Rating) {
    if (!word) return;
    await studyApplicationService.gradeCard(word.id, rating);
    await loadNext();
  }


  return (
    <div className="vstack gap-3" data-testid="study-page-ready">
      <RnwPageHeader
        title={pageConfig.pages.study.title}
        icon={<i className={pageConfig.pages.study.iconClass} aria-hidden="true" />}
        testID={pageConfig.pages.study.testID}
      />
      <CrossFeatureActionBar
        current="study"
        onNavigate={(target) => navigate(`/${target}`)}
        tagFilter={{
          allTagCount: allTags.length,
          activeCount: appliedTags?.length ?? 0,
          onToggle: () => setFilterExpanded(!isFilterExpanded),
          testID: "rnw-study-tags",
        }}
        trailing={<SyncButton onSyncSuccess={() => { void loadTags(); void loadNext(); }} />}
        testID="rnw-study-action-bar"
      />

      {/* Tag Filter Panel - Collapsible */}
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

      {error ? (
        <RnwInlineNotice
          tone="error"
          message={error}
          icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
        />
      ) : null}

      {!word || !memory ? (
        <RnwInlineNotice
          tone="info"
          message="Study complete. No words to study yet. Add new words or check back later."
          icon={<i className="fa-solid fa-circle-check" aria-hidden="true" />}
        />
      ) : (
        <RnwFlashCard
          word={word}
          memory={memory}
          onRate={rate}
          onOpenExamples={(wordId) => navigate(`/examples?wordId=${encodeURIComponent(wordId)}`)}
        />
      )}
    </div>
  );
}
