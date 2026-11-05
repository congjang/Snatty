/**
 * AI job queue — production: BullMQ + Redis (see docs/first-launch/05-ai-pipeline.md).
 * This module is intentionally a no-op stub until Redis worker is wired.
 */

export type AiJobKind = "summary" | "weekly_stats" | "reflection_card" | "timeline_summary";

export type EnqueueAiJobParams = {
  entryId: string;
  userId: string;
  kind: AiJobKind;
};

/** Stub: log only. Replace with queue.add(...) when BullMQ is configured. */
export function enqueueAiJob(params: EnqueueAiJobParams): void {
  if (process.env.NODE_ENV !== "production") {
    console.info("[snatty-api][ai-queue] stub enqueue", params);
  }
}
