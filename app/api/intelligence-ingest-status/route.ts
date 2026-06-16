import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/src/lib/supabase/admin";
import { createIntelligenceRepository } from "@/src/modules/intelligence/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const INTELLIGENCE_JOB_TYPE = "intelligence-ingest";

export async function GET() {
  try {
    const repository = createIntelligenceRepository(createSupabaseAdmin());
    const latestJob = await repository.getLatestCompletedJobSummary(INTELLIGENCE_JOB_TYPE);

    return NextResponse.json(
      latestJob
        ? {
            status: "completed",
            jobType: latestJob.jobType,
            articleCount: latestJob.fetchedCount,
            fetchedCount: latestJob.fetchedCount,
            insertedCount: latestJob.insertedCount,
            sourceCount: latestJob.sourceCount,
            startedAt: latestJob.startedAt,
            finishedAt: latestJob.finishedAt,
          }
        : {
            status: "pending",
            jobType: INTELLIGENCE_JOB_TYPE,
            articleCount: 0,
            fetchedCount: 0,
            insertedCount: 0,
            sourceCount: 0,
            startedAt: null,
            finishedAt: null,
          },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("[Intelligence Ingest Status API] failed:", error);

    return NextResponse.json(
      { error: "Unable to load intelligence ingest status" },
      { status: 502 }
    );
  }
}
