// frontend/src/rnw/react-native.tsx

import { useState, type CSSProperties, type ReactNode } from "react";

type PressableStyle = CSSProperties | ((state: { pressed: boolean }) => CSSProperties);

export type PressableProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: PressableStyle;
  testID?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  ariaLabel?: string;
};

type ViewProps = {
  children: ReactNode;
  style?: CSSProperties;
  testID?: string;
};

type TextProps = {
  children: ReactNode;
  style?: CSSProperties;
};

type TextInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  type?: string;
  style?: CSSProperties;
  testID?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export function Pressable({
  children,
  onPress,
  style,
  testID,
  disabled,
  type = "button",
  ariaLabel,
}: PressableProps) {
  const [pressed, setPressed] = useState(false);
  const resolvedStyle = typeof style === "function" ? style({ pressed }) : style;

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onPress}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={(e) => {
        setPressed(false);
        if (type === "submit") {
          // submit ボタンはブラウザのネイティブ form.submit() に委ねる
          // preventDefault() を呼ぶと click イベントが抑制されフォーム送信が壊れる
          return;
        }
        e.preventDefault(); // prevent 300ms click delay on mobile (button/reset のみ)
        if (!disabled && onPress) {
          onPress();
        }
      }}
      data-testid={testID}
      style={{ touchAction: "manipulation", ...resolvedStyle }}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function View({ children, style, testID }: ViewProps) {
  return (
    <div style={style} data-testid={testID}>
      {children}
    </div>
  );
}

export function Text({ children, style }: TextProps) {
  return (
    <span
      style={{
        display: "inline-block",
        lineHeight: "inherit",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function TextInput({ value, onChangeText, placeholder, autoFocus, autoComplete, type, style, testID, onFocus, onBlur }: TextInputProps) {
  return (
    <input
      value={value}
      onChange={(event) => onChangeText(event.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      type={type}
      style={style}
      data-testid={testID}
      onFocus={onFocus} // ← 追加
      onBlur={onBlur}   // ← 追加
    />
  );
}