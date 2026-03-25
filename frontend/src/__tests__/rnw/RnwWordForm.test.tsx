import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RnwWordForm } from "../../rnw/components/RnwWordForm";

describe("RnwWordForm", () => {
  it("submits tags parsed from comma-separated input", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(<RnwWordForm onSave={onSave} />);

    fireEvent.change(screen.getByTestId("rnw-word-form-headword"), { target: { value: "run" } });
    fireEvent.change(screen.getByTestId("rnw-word-form-meaning"), { target: { value: "走る" } });
    fireEvent.change(screen.getByTestId("rnw-word-form-tags"), { target: { value: "sports, daily, sports" } });
    fireEvent.click(screen.getByTestId("rnw-submit-button"));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          headword: "run",
          entries: expect.arrayContaining([
            expect.objectContaining({
              meanings: expect.arrayContaining([
                expect.objectContaining({ meaningJa: "走る", tags: ["sports", "daily"] }),
              ]),
            }),
          ]),
        }),
      );
    });
  });
});
