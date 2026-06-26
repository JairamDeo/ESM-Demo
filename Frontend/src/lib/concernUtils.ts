export type ConcernScope = "general" | "document" | "both";

export interface ConcernDocumentRef {
  documentLabel: string;
  documentText?: string;
  documentUploadId?: string;
  uploadId?: string;
}

interface RawConcernDocument {
  documentLabel: string;
  documentText?: string;
  documentUploadId?: string;
}

interface ConcernLike extends Partial<RawConcernDocument> {
  concernDocuments?: RawConcernDocument[];
}

interface TimelineEvent {
  eventType: string;
  updatedAt?: string;
}

interface Comment {
  authorRole: string;
  createdAt: string;
}

interface GrievanceLike {
  concernStatus?: string;
  comments?: Comment[];
  timeline?: TimelineEvent[];
}

export function getConcernDocuments(concern: ConcernLike | null | undefined): ConcernDocumentRef[] {
  if (!concern) return [];
  if (concern.concernDocuments?.length) {
    return concern.concernDocuments.map((d: RawConcernDocument) => ({
      documentLabel: d.documentLabel,
      documentText: d.documentText,
      documentUploadId: d.documentUploadId,
      uploadId: d.documentUploadId,
    }));
  }
  if (concern.documentLabel) {
    return [{
      documentLabel: concern.documentLabel,
      documentText: concern.documentText,
      documentUploadId: concern.documentUploadId,
      uploadId: concern.documentUploadId,
    }];
  }
  return [];
}

export function concernNeedsGeneral(scope?: string): boolean {
  return scope === "general" || scope === "both";
}

export function concernNeedsDocuments(scope?: string): boolean {
  return scope === "document" || scope === "both";
}

export function timelineConcernLabel(scope?: string, docs?: ConcernDocumentRef[]): string {
  const count = docs?.length ?? 0;
  if (scope === "both") {
    return count > 0 ? `Details + ${count} document(s)` : "Details + Documents";
  }
  if (scope === "document" && count > 1) {
    return `Document Concern · ${count} documents`;
  }
  if (scope === "document" && count === 1) {
    return `Document Concern · ${docs![0].documentLabel}`;
  }
  return "General Concern";
}

export function veteranResponseLabel(scope?: string, docs?: ConcernDocumentRef[]): string {
  const count = docs?.length ?? 0;
  if (scope === "both") {
    return count > 0 ? `Corrected details + ${count} document(s)` : "Corrected details";
  }
  if ((scope === "document" || scope === "both") && count > 1) {
    return `Re-uploaded · ${count} documents`;
  }
  if (count === 1) {
    return `Re-uploaded · ${docs![0].documentLabel}`;
  }
  return "Veteran Response";
}

export type ConcernStatusValue = "none" | "awaiting_veteran" | "awaiting_officer";

/** Match backend deriveConcernStatus — respects concern_resolved timeline events. */
export function deriveConcernStatus(comments: Comment[] = [], timeline: TimelineEvent[] = []): ConcernStatusValue {
  const lastResolved = [...timeline].reverse().find((t) => t.eventType === "concern_resolved");
  const resolvedAt = lastResolved?.updatedAt ? new Date(lastResolved.updatedAt).getTime() : 0;
  const openComments = comments.filter(
    (c) => new Date(c.createdAt).getTime() > resolvedAt
  );
  if (openComments.length === 0) return "none";
  const last = openComments[openComments.length - 1];
  return last.authorRole === "user" ? "awaiting_officer" : "awaiting_veteran";
}

export function getEffectiveConcernStatus(g: GrievanceLike | null | undefined): ConcernStatusValue {
  const stored = g?.concernStatus as ConcernStatusValue | undefined;
  if (stored === "none") return "none";
  if (stored === "awaiting_veteran" || stored === "awaiting_officer") return stored;
  return deriveConcernStatus(g?.comments || [], g?.timeline || []);
}

export function isConcernBlockingStatus(status?: string): boolean {
  return status === "awaiting_veteran" || status === "awaiting_officer";
}
