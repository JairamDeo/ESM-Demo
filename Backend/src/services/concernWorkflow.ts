import type { IComment, ITimeline } from "../models/Grievance";

export type ConcernStatus = "none" | "awaiting_veteran" | "awaiting_officer";

export function isConcernBlocking(status?: ConcernStatus | string | null): boolean {
  return status === "awaiting_veteran" || status === "awaiting_officer";
}

/** Backfill concernStatus for records created before the field existed. */
export function deriveConcernStatus(
  comments: IComment[],
  timeline: ITimeline[] = []
): ConcernStatus {
  const lastResolved = [...timeline].reverse().find((t) => t.eventType === "concern_resolved");
  const resolvedAt = lastResolved?.updatedAt ? new Date(lastResolved.updatedAt).getTime() : 0;

  const openComments = comments.filter(
    (c) => new Date(c.createdAt).getTime() > resolvedAt
  );

  if (openComments.length === 0) return "none";

  const last = openComments[openComments.length - 1];
  return last.authorRole === "user" ? "awaiting_officer" : "awaiting_veteran";
}

export function concernStatusLabel(status: ConcernStatus): string {
  switch (status) {
    case "awaiting_veteran":
      return "Awaiting veteran response";
    case "awaiting_officer":
      return "Awaiting officer review";
    default:
      return "No open concern";
  }
}

export function effectiveConcernStatus(grievance: {
  concernStatus?: ConcernStatus | string;
  comments?: IComment[];
  timeline?: ITimeline[];
}): ConcernStatus {
  const stored = grievance.concernStatus as ConcernStatus | undefined;

  // If the stored value is explicitly "none" (set when an officer resolves a concern),
  // check if the last concern_resolved timeline event is at or after the last comment.
  // If so, the concern is truly resolved — trust the stored "none" and skip derivation.
  if (stored === "none") {
    const timeline = grievance.timeline || [];
    const lastResolved = [...timeline].reverse().find((t) => t.eventType === "concern_resolved");
    if (lastResolved?.updatedAt) {
      const resolvedAt = new Date(lastResolved.updatedAt).getTime();
      const comments = grievance.comments || [];
      const lastComment = comments[comments.length - 1];
      const lastCommentAt = lastComment?.createdAt
        ? new Date(lastComment.createdAt).getTime()
        : 0;
      // The resolution is at or after the last comment — concern is closed.
      if (resolvedAt >= lastCommentAt) return "none";
    }
  }

  const derived = deriveConcernStatus(grievance.comments || [], grievance.timeline || []);
  if (derived !== "none") return derived;

  // Fallback: for old records without a stored concernStatus, derive from comments alone.
  if (stored === "awaiting_veteran" || stored === "awaiting_officer") return stored;
  return "none";
}
