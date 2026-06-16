import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdmin: vi.fn(),
  createIntelligenceRepository: vi.fn(),
  getLatestCompletedJobSummary: vi.fn(),
}));

vi.mock("@/src/lib/supabase/admin", () => ({
  createSupabaseAdmin: vi.fn(() => mocks.createSupabaseAdmin()),
}));

vi.mock("@/src/modules/intelligence/repository", () => ({
  createIntelligenceRepository: vi.fn((client: unknown) => {
    mocks.createIntelligenceRepository(client);

    return {
      getLatestCompletedJobSummary: mocks.getLatestCompletedJobSummary,
    };
  }),
}));

async function getIngestStatus() {
  const { GET } = await import("./route");

  return GET();
}

describe("GET /api/intelligence-ingest-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseAdmin.mockReturnValue({ supabase: "admin" });
  });

  it("returns the latest completed intelligence ingest article count", async () => {
    mocks.getLatestCompletedJobSummary.mockResolvedValue({
      id: "job-1",
      jobType: "intelligence-ingest",
      sourceCount: 19,
      fetchedCount: 184,
      insertedCount: 184,
      startedAt: "2026-06-17T07:00:00.000Z",
      finishedAt: "2026-06-17T07:01:00.000Z",
    });

    const response = await getIngestStatus();

    await expect(response.json()).resolves.toEqual({
      status: "completed",
      jobType: "intelligence-ingest",
      articleCount: 184,
      fetchedCount: 184,
      insertedCount: 184,
      sourceCount: 19,
      startedAt: "2026-06-17T07:00:00.000Z",
      finishedAt: "2026-06-17T07:01:00.000Z",
    });
    expect(response.status).toBe(200);
    expect(mocks.createIntelligenceRepository).toHaveBeenCalledWith({ supabase: "admin" });
    expect(mocks.getLatestCompletedJobSummary).toHaveBeenCalledWith("intelligence-ingest");
  });

  it("returns a pending status before the first successful ingest", async () => {
    mocks.getLatestCompletedJobSummary.mockResolvedValue(null);

    const response = await getIngestStatus();

    await expect(response.json()).resolves.toEqual({
      status: "pending",
      jobType: "intelligence-ingest",
      articleCount: 0,
      fetchedCount: 0,
      insertedCount: 0,
      sourceCount: 0,
      startedAt: null,
      finishedAt: null,
    });
    expect(response.status).toBe(200);
  });
});
