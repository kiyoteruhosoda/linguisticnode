import type { ExampleTestItem } from "../../../../src/api/types";

/**
 * preferredWordId に一致する例文に絞り込む。
 * 一致するものがなければ全アイテムをそのまま返す（フォールバック）。
 */
export function filterByPreferredWord(
  items: ExampleTestItem[],
  preferredWordId: string,
): ExampleTestItem[] {
  const preferred = items.filter((it) => it.word.id === preferredWordId);
  return preferred.length > 0 ? preferred : items;
}

/**
 * 次に表示する例文を選択する。
 * - lastExampleId が指定されていれば順次進行（末尾で先頭に戻る）
 * - 指定がなければ random でランダム選択
 */
export function selectNextExample(
  items: ExampleTestItem[],
  lastExampleId: string | null | undefined,
  random: () => number = Math.random,
): ExampleTestItem | null {
  if (items.length === 0) return null;

  if (lastExampleId) {
    const currentIdx = items.findIndex((it) => it.id === lastExampleId);
    const nextIdx = currentIdx + 1;
    return (nextIdx < items.length ? items[nextIdx] : items[0]) ?? null;
  }

  return items[Math.floor(random() * items.length)] ?? null;
}
