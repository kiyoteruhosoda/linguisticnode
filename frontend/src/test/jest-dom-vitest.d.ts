// jest-dom（7.0.1 まで）の型は vitest 4 までの `Assertion<T>` を拡張する作りで、
// vitest 5 の `Assertion<R, T>`・`Matchers<R, T>` には乗らない（#688）。
// jest-dom が追いつくまで、vitest 5 の勧める `Matchers` の拡張でここから足す。
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import "vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown>
    extends TestingLibraryMatchers<unknown, R> {}
}
