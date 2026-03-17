// frontend/src/rnw/theme/tokens.ts

export const colors = {
  primary: "#0d6efd",
  secondary: "#6c757d",
  success: "#198754",
  danger: "#dc3545",
  warning: "#ffc107",

  white: "#ffffff",
  darkText: "#212529",
  transparent: "transparent",

  light: "#f8f9fa",
  lightBorder: "#dee2e6",
  lightPressed: "#e9ecef",
} as const;

/**
 * Button size tokens (Bootstrap btn / btn-sm 相当)
 * - RNW前提：Textの style は配列ではなく単体オブジェクトで渡す想定
 */
export const buttonSizes = {
  md: {
    height: 38,
    paddingInline: 12,
    fontSize: 14,
    iconSize: 14,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    lineHeight: "20px",
  },
  sm: {
    height: 30,
    paddingInline: 10,
    fontSize: 13,
    iconSize: 13,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
    lineHeight: "20px",
  },
  icon: {
    height: 44,
    paddingInline: 0,
    fontSize: 16,
    iconSize: 16,
    borderRadius: 6,
    borderWidth: 1,
    gap: 0,
    lineHeight: "24px",
  },
} as const;

export type RnwButtonSize = keyof typeof buttonSizes;
export type RnwButtonTone =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "light";
export type RnwButtonKind = "solid" | "outline";