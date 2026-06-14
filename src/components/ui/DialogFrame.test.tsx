import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DialogFrame } from "./DialogFrame";

describe("DialogFrame", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("focuses the first control, closes on Escape, and restores focus", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <DialogFrame isOpen onClose={onClose} labelledBy="dialog-title">
          <h2 id="dialog-title">Dialog</h2>
          <button type="button">First action</button>
        </DialogFrame>
      );
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(document.activeElement?.textContent).toBe("First action");

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root.render(
        <DialogFrame isOpen={false} onClose={onClose} labelledBy="dialog-title">
          <h2 id="dialog-title">Dialog</h2>
        </DialogFrame>
      );
    });

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
