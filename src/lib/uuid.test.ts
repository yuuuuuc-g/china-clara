import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid";

describe("isUuid", () => {
  it("accepts canonical version 1-5 UUIDs", () => {
    const valid = [
      "b7c8e0a2-1d3f-4a5b-8c9d-0e1f2a3b4c5d",
      "00000000-0000-1000-8000-000000000000",
      "F81D4FAE-7DEC-11D0-A765-00A0C91E6BF6",
      "9f1a7b2c-3e4d-5a6b-b7c8-9d0e1f2a3b4c",
    ];

    for (const value of valid) {
      expect(isUuid(value), value).toBe(true);
    }
  });

  it("rejects malformed or non-UUID strings", () => {
    const invalid = [
      "",
      "not-a-uuid",
      "b7c8e0a2-1d3f-4a5b-8c9d-0e1f2a3b4c5", // final group too short
      "b7c8e0a21d3f4a5b8c9d0e1f2a3b4c5d", // missing hyphens
      "b7c8e0a2-1d3f-6a5b-8c9d-0e1f2a3b4c5d", // version digit out of 1-5 range
      "b7c8e0a2-1d3f-4a5b-0c9d-0e1f2a3b4c5d", // variant digit out of 8-b range
      "g7c8e0a2-1d3f-4a5b-8c9d-0e1f2a3b4c5d", // non-hex character
    ];

    for (const value of invalid) {
      expect(isUuid(value), value).toBe(false);
    }
  });
});
