// frontend/src/rnw/components/RnwButton.tsx

import type { ReactNode } from "react";
import { Pressable, Text } from "../react-native";
import { StyleSheet } from "../stylesheet";
import { buttonSizes, type RnwButtonKind, type RnwButtonSize, type RnwButtonTone } from "../theme/tokens";
import { buttonTheme } from "../theme/buttonTheme";

export type RnwButtonHtmlType = "button" | "submit" | "reset";

export type RnwButtonProps = {
  label?: string;
  icon?: ReactNode;

  /**
   * type="submit" の場合は、基本は <form onSubmit> 側で処理するのが安全。
   * submit でも onPress を動かしたい場合は、別途 submit 専用ハンドラ設計を推奨。
   */
  onPress?: () => void;

  testID?: string;
  disabled?: boolean;
  fullWidth?: boolean;

  tone?: RnwButtonTone;
  kind?: RnwButtonKind;
  size?: RnwButtonSize;

  title?: string;
  type?: RnwButtonHtmlType;
};

export function RnwButton({
  label,
  icon,
  onPress,
  testID,
  disabled = false,
  fullWidth = false,
  tone = "primary",
  kind = "outline",
  size = "md",
  title,
  type = "button",
}: RnwButtonProps) {
  const s = buttonSizes[size];
  const p = buttonTheme[tone][kind];

  const isIconOnly = !!icon && !label;
  const ariaLabel = label ?? title;

  // a11y: icon-only なら aria-label が欲しい
  if (process.env.NODE_ENV !== "production") {
    if (isIconOnly && !ariaLabel) {
      console.warn("RnwButton: icon-only button requires `title` (aria-label).");
    }
  }

  // 安全策：submit は form の onSubmit に寄せる（onPress は無効化）
  const resolvedOnPress = type === "submit" ? undefined : onPress;

  return (
    <Pressable
      onPress={disabled ? undefined : resolvedOnPress}
      testID={testID}
      disabled={disabled}
      type={type}
      ariaLabel={ariaLabel}
      style={({ pressed }) => {
        const base = {
          ...styles.base,
          height: s.height,
          borderRadius: s.borderRadius,
          borderWidth: s.borderWidth,
          gap: s.gap,
        } as const;

        const layout = isIconOnly
          ? { width: s.height, paddingInline: 0 }
          : { paddingInline: s.paddingInline, ...(fullWidth ? styles.fullWidth : {}) };

        const palette = {
          backgroundColor: p.bg,
          borderColor: p.border,
          color: p.text, // 親color継承
        };

        const pressedStyle =
          pressed && !disabled
            ? {
                backgroundColor: p.pressedBg,
                borderColor: p.pressedBorder,
                color: p.pressedText,
                opacity: p.pressedOpacity,
              }
            : {};

        const disabledStyle = disabled ? styles.disabled : {};

        return { ...base, ...layout, ...palette, ...pressedStyle, ...disabledStyle };
      }}
    >
      {icon ? (
        <Text style={{ ...styles.icon, fontSize: s.iconSize, lineHeight: s.lineHeight }}>
          {/* icon 自体には aria-hidden を付けて、ラベルは button(ariaLabel) 側に集約 */}
          <span aria-hidden="true">{icon}</span>
        </Text>
      ) : null}

      {label ? <Text style={{ ...styles.text, fontSize: s.fontSize, lineHeight: s.lineHeight }}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  fullWidth: { width: "100%" },
  disabled: { opacity: 0.5, cursor: "not-allowed" },
  icon: { display: "inline-flex", alignItems: "center" },
  text: { fontWeight: 500 },
});