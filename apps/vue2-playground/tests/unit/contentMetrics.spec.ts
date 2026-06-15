import { describe, expect, it } from "bun:test";
import { getContentMetrics } from "../../src/utils/contentMetrics";

describe("contentMetrics", () => {
  it("counts words, lines, and characters", () => {
    expect(getContentMetrics("hello world\nsecond line")).toEqual({
      words: 4,
      lines: 2,
      chars: 23,
    });
  });

  it("returns zero counts for empty content", () => {
    expect(getContentMetrics("")).toEqual({
      words: 0,
      lines: 0,
      chars: 0,
    });
  });
});
