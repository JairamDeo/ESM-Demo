import mongoose from "mongoose";
import type { IComment, ConcernScope } from "../models/Grievance";

export interface ConcernDocumentItem {
  documentLabel: string;
  documentText?: string;
  documentUploadId?: mongoose.Types.ObjectId;
  replacedDocumentUrl?: string;
}

export function parseDocumentUploadIds(body: Record<string, unknown>): string[] {
  const raw = body.documentUploadIds ?? body.documentUploadId;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

export function getConcernDocumentsFromComment(comment?: IComment | null): ConcernDocumentItem[] {
  if (!comment) return [];
  const docs = (comment as IComment & { concernDocuments?: ConcernDocumentItem[] }).concernDocuments;
  if (docs?.length) return docs;
  if (comment.documentLabel) {
    return [{
      documentLabel: comment.documentLabel,
      documentText: comment.documentText,
      documentUploadId: comment.documentUploadId,
    }];
  }
  return [];
}

export function concernNeedsGeneral(scope?: ConcernScope | string): boolean {
  return scope === "general" || scope === "both";
}

export function concernNeedsDocuments(scope?: ConcernScope | string): boolean {
  return scope === "document" || scope === "both";
}

export function resolveOfficerConcernScope(
  includeGeneral: boolean,
  documentCount: number
): ConcernScope {
  if (includeGeneral && documentCount > 0) return "both";
  if (includeGeneral) return "general";
  return "document";
}

export function formatConcernDocumentLabels(docs: ConcernDocumentItem[]): string {
  if (docs.length === 0) return "";
  if (docs.length === 1) return docs[0].documentLabel;
  return `${docs.length} documents (${docs.map((d) => d.documentLabel).join(", ")})`;
}
