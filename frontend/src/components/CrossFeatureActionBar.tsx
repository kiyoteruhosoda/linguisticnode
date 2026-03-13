import type { ReactNode } from "react";
import { RnwButton } from "../rnw/components/RnwButton";
import { RnwTagFilterButton } from "../rnw/components/RnwTagFilterButton";
import { RnwActionBar } from "@linguisticnode/ui";
import pageConfig from "../config/pageConfig.json";

export type FeatureRoute = "words" | "study" | "examples";

type TagFilterState = {
  allTagCount: number;
  activeCount: number;
  onToggle: () => void;
  testID: string;
};

type CrossFeatureActionBarProps = {
  current: FeatureRoute;
  onNavigate: (target: FeatureRoute) => void;
  trailing?: ReactNode;
  tagFilter?: TagFilterState;
  extraLeading?: ReactNode;
  testID: string;
};

export function CrossFeatureActionBar({
  current,
  onNavigate,
  trailing,
  tagFilter,
  extraLeading,
  testID,
}: CrossFeatureActionBarProps) {
  const actions = pageConfig.navigation[current];

  return (
    <RnwActionBar
      leading={
        <>
          {actions.map((action) => (
            <RnwButton
              key={action.target}
              label={action.label}
              onPress={() => onNavigate(action.target as FeatureRoute)}
              icon={<i className={action.iconClass} aria-hidden="true" />}
              testID={action.testID}
              kind="outline"
              tone="primary"
            />
          ))}

          {tagFilter && tagFilter.allTagCount > 0 ? (
            <RnwTagFilterButton
              activeCount={tagFilter.activeCount}
              onPress={tagFilter.onToggle}
              testID={tagFilter.testID}
            />
          ) : null}

          {extraLeading ?? null}
        </>
      }
      trailing={trailing}
      testID={testID}
    />
  );
}
