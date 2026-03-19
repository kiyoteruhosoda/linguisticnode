import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pressable } from "../../rnw/react-native";

describe("RNW Pressable shim", () => {
  it("applies pressed style callback", () => {
    render(
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        testID="pressable"
      >
        label
      </Pressable>,
    );

    const button = screen.getByTestId("pressable");
    expect(button).toHaveStyle({ opacity: "1" });

    fireEvent.mouseDown(button);
    expect(button).toHaveStyle({ opacity: "0.5" });

    fireEvent.mouseUp(button);
    expect(button).toHaveStyle({ opacity: "1" });
  });

  it("does not invoke onPress when disabled (click)", () => {
    const onPress = vi.fn();
    render(
      <Pressable onPress={onPress} disabled testID="disabled-pressable">
        label
      </Pressable>,
    );

    fireEvent.click(screen.getByTestId("disabled-pressable"));
    expect(onPress).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // wordsのワンタップ修正 — touchEnd で直接 onPress を呼ぶ（300ms delay 解消）
  // ──────────────────────────────────────────────────────────────────────────

  it("touchEnd で onPress が即時呼ばれる（モバイルのワンタップ）", () => {
    const onPress = vi.fn();
    render(
      <Pressable onPress={onPress} testID="pressable">
        label
      </Pressable>,
    );

    const button = screen.getByTestId("pressable");
    fireEvent.touchEnd(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("touchEnd では disabled のとき onPress を呼ばない", () => {
    const onPress = vi.fn();
    render(
      <Pressable onPress={onPress} disabled testID="pressable">
        label
      </Pressable>,
    );

    fireEvent.touchEnd(screen.getByTestId("pressable"));
    expect(onPress).not.toHaveBeenCalled();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // P1修正: type="submit" はブラウザの form.submit() に委ねる
  // ──────────────────────────────────────────────────────────────────────────

  it("type=submit のとき touchEnd は preventDefault を呼ばない（フォーム送信を妨げない）", () => {
    render(
      <Pressable type="submit" testID="submit-pressable">
        Submit
      </Pressable>,
    );

    const button = screen.getByTestId("submit-pressable");
    const touchEndEvent = new TouchEvent("touchend", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(touchEndEvent, "preventDefault");

    button.dispatchEvent(touchEndEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it("type=submit のとき touchEnd で onPress は呼ばれない（form.submit() に委ねる）", () => {
    const onPress = vi.fn();
    render(
      <Pressable type="submit" onPress={onPress} testID="submit-pressable">
        Submit
      </Pressable>,
    );

    fireEvent.touchEnd(screen.getByTestId("submit-pressable"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("touchEnd は preventDefault を呼ぶ（300ms click delay を防ぐ）", () => {
    const onPress = vi.fn();
    render(
      <Pressable onPress={onPress} testID="pressable">
        label
      </Pressable>,
    );

    const button = screen.getByTestId("pressable");
    const touchEndEvent = new TouchEvent("touchend", { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(touchEndEvent, "preventDefault");

    button.dispatchEvent(touchEndEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it("touch-action: manipulation が style 属性に含まれている（ダブルタップズーム無効化）", () => {
    render(
      <Pressable testID="pressable">
        label
      </Pressable>,
    );

    const button = screen.getByTestId("pressable");
    // JSDOM は touchAction を computed style として返さないため style 属性を直接確認する
    expect(button.style.touchAction).toBe("manipulation");
  });

  it("touchStart → touchEnd の順で pressed 状態が変化する", () => {
    render(
      <Pressable
        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        testID="pressable"
      >
        label
      </Pressable>,
    );

    const button = screen.getByTestId("pressable");
    expect(button).toHaveStyle({ opacity: "1" });

    fireEvent.touchStart(button);
    expect(button).toHaveStyle({ opacity: "0.5" });

    fireEvent.touchEnd(button);
    expect(button).toHaveStyle({ opacity: "1" });
  });
});
