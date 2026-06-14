import { describe, expect, it, vi } from "vitest";
import {
  runDailyBriefingJob,
  type BriefingItem,
  type RawHeadline,
} from "./daily-briefing-job";

const headline: RawHeadline = {
  source: "Macro Desk",
  title: "Central bank changes liquidity stance",
  url: "https://example.test/liquidity",
  snippet: "Policy signal.",
  publishedAt: "2026-06-14T00:00:00.000Z",
};

const briefing: BriefingItem = {
  source: "Macro Desk",
  title: "Central bank changes liquidity stance",
  url: "https://example.test/liquidity",
  ai_summary: "流动性政策信号变化。",
};

describe("runDailyBriefingJob", () => {
  it("fetches, selects, whitelists, and persists daily briefings", async () => {
    const persistBriefings = vi.fn().mockResolvedValue([{ id: "briefing-1", ...briefing }]);

    const result = await runDailyBriefingJob({
      fetchHeadlines: vi.fn().mockResolvedValue([headline]),
      selectBriefings: vi.fn().mockResolvedValue([
        briefing,
        {
          ...briefing,
          title: "Hallucinated URL",
          url: "https://example.test/not-in-source",
        },
      ]),
      persistBriefings,
      now: () => new Date("2026-06-14T08:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "completed",
      date: "2026-06-14",
      candidatesCount: 1,
      selectedCount: 1,
      inserted: [{ id: "briefing-1", ...briefing }],
    });
    expect(persistBriefings).toHaveBeenCalledWith([
      {
        date: "2026-06-14",
        source: "Macro Desk",
        title: "Central bank changes liquidity stance",
        url: "https://example.test/liquidity",
        ai_summary: "流动性政策信号变化。",
      },
    ]);
  });

  it("fails before selection when no source headlines are fetched", async () => {
    const result = await runDailyBriefingJob({
      fetchHeadlines: vi.fn().mockResolvedValue([]),
      selectBriefings: vi.fn(),
      persistBriefings: vi.fn(),
      now: () => new Date("2026-06-14T08:00:00.000Z"),
    });

    expect(result).toEqual({
      status: "failed",
      statusCode: 502,
      error: "No headlines fetched from any RSS source.",
    });
  });
});
