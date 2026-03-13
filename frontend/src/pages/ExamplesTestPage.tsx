import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { examplesApplicationService } from "../examples/examplesApplication";
import { checkAnswer, createBlankedSentence } from "../core/examples/exampleSentencePolicy";
import { useTagFilterState } from "../hooks/useTagFilterState";
import type { ExampleTestItem } from "../api/types";
import SyncButton from "../components/SyncButton";
import { speechApplicationService } from "../speech/speechApplication";
import { RnwTagFilterPanel } from "../rnw/components/RnwTagFilterPanel";
import { RnwInlineNotice } from "../rnw/components/RnwInlineNotice";
import { RnwExamplesQuizCard } from "../rnw/components/RnwExamplesQuizCard";
import { CrossFeatureActionBar } from "../components/CrossFeatureActionBar";
import { RnwPageHeader } from "@linguisticnode/ui";
import pageConfig from "../config/pageConfig.json";

export function ExamplesTestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredWordId = searchParams.get("wordId");
  const preferredWordIdRef = useRef<string | null>(preferredWordId);
  const [example, setExample] = useState<ExampleTestItem | null>(null);
  const [blankedSentence, setBlankedSentence] = useState<string>("");
  const [actualWordInSentence, setActualWordInSentence] = useState<string | null>(null);
  const lastExampleIdRef = useRef<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showWordInfo, setShowWordInfo] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSpeak = useMemo(() => speechApplicationService.canSpeak(), []);

  const [allTags, setAllTags] = useState<string[]>([]);
  const {
    selectedTags,
    appliedTags,
    isFilterExpanded,
    setFilterExpanded,
    handleToggleTagSelection,
    applyFilter,
    clearFilter,
  } = useTagFilterState("examples");

  const loadTags = useCallback(async () => {
    try {
      const tags = await examplesApplicationService.getAllTags();
      setAllTags(tags);
    } catch (e) {
      console.error("Failed to load tags:", e);
    }
  }, []);


  useEffect(() => {
    preferredWordIdRef.current = preferredWordId;
  }, [preferredWordId]);

  const loadNext = useCallback(async (cursor: string | null) => {
    setError(null);
    setUserInput("");
    setFeedback(null);
    setShowAnswer(false);

    try {
      const preferred = cursor ? null : preferredWordIdRef.current;
      const nextExample = await examplesApplicationService.fetchNextExample(appliedTags, cursor, preferred);
      if (preferred) {
        preferredWordIdRef.current = null;
      }
      if (!nextExample) {
        setExample(null);
        setBlankedSentence("");
        setActualWordInSentence(null);
        lastExampleIdRef.current = null;
      } else {
        setExample(nextExample);
        const { blanked, actualWord, found } = createBlankedSentence(nextExample.en, nextExample.word.headword);
        if (!found) {
          console.warn("Target word not found in sentence:", nextExample.word.headword, nextExample.en);
        }
        setBlankedSentence(blanked);
        setActualWordInSentence(actualWord);
        lastExampleIdRef.current = nextExample.id;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [appliedTags]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    lastExampleIdRef.current = null;
    void loadNext(null);
  }, [appliedTags, loadNext]);

  function handleSubmitAnswer() {
    if (!example) return;

    if (!userInput.trim()) {
      setFeedback("incorrect");
      setShowAnswer(true);
      return;
    }

    const targetWord = actualWordInSentence || example.word.headword;
    const isCorrect = checkAnswer(userInput, targetWord);
    setFeedback(isCorrect ? "correct" : "incorrect");
    setShowAnswer(true);
  }

  function handleNext() {
    setShowWordInfo(false);
    setShowTranslation(false);
    void loadNext(lastExampleIdRef.current);
  }

  function speakSentence() {
    if (!canSpeak || !example?.en) return;
    speechApplicationService.speakEnglish(example.en);
  }

  function speakAnswer() {
    if (!canSpeak || !example) return;
    speechApplicationService.speakEnglish(actualWordInSentence || example.word.headword);
  }

  function openStudyForCurrentWord() {
    if (!example) return;
    navigate(`/study?wordId=${encodeURIComponent(example.word.id)}`);
  }

  return (
    <div className="vstack gap-3" data-testid="examples-page-ready">
      <RnwPageHeader
        title={pageConfig.pages.examples.title}
        icon={<i className={pageConfig.pages.examples.iconClass} aria-hidden="true" />}
        testID={pageConfig.pages.examples.testID}
      />
      <CrossFeatureActionBar
        current="examples"
        onNavigate={(target) => navigate(`/${target}`)}
        tagFilter={{
          allTagCount: allTags.length,
          activeCount: appliedTags?.length ?? 0,
          onToggle: () => setFilterExpanded(!isFilterExpanded),
          testID: "rnw-examples-tags",
        }}
        trailing={<SyncButton onSyncSuccess={() => { void loadTags(); void loadNext(null); }} />}
        testID="rnw-examples-action-bar"
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

      {error ? (
        <RnwInlineNotice
          tone="error"
          message={error}
          icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
        />
      ) : null}

      {!example ? (
        <RnwInlineNotice
          tone="info"
          message="No examples available. Add example sentences to your words first."
          icon={<i className="fa-solid fa-circle-info" aria-hidden="true" />}
        />
      ) : (
        <RnwExamplesQuizCard
          example={example}
          blankedSentence={blankedSentence}
          actualWordInSentence={actualWordInSentence}
          userInput={userInput}
          feedback={feedback}
          showAnswer={showAnswer}
          showWordInfo={showWordInfo}
          showTranslation={showTranslation}
          canSpeak={canSpeak}
          onShowWordInfo={() => setShowWordInfo(true)}
          onToggleTranslation={() => setShowTranslation(true)}
          onSpeakSentence={speakSentence}
          onSpeakAnswer={speakAnswer}
          onGoToStudy={openStudyForCurrentWord}
          onInputChange={setUserInput}
          onSubmitAnswer={handleSubmitAnswer}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
