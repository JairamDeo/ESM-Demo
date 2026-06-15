export type GrievanceDraftStep = "raise" | "checklist" | "review";

export interface GrievanceDraft {
  form: {
    concernType?: string;
    caseType?: string;
    caseTypeId?: string;
    stationHQ?: string;
    description?: string;
    armyNumber?: string;
    rank?: string;
  };
  isFromQR?: boolean;
  step: GrievanceDraftStep;
  savedAt: string;
}

function draftKey(userId?: string) {
  return userId ? `vitric_grievance_draft_${userId}` : "vitric_grievance_draft";
}

const DRAFT_SESSION_KEY = "vitric_draft_in_progress";

export const GRIEVANCE_FLOW_PATHS = [
  "/user/raise-grievance",
  "/user/document-checklist",
  "/user/review-submit",
] as const;

export function isGrievanceFlowPath(pathname: string) {
  return GRIEVANCE_FLOW_PATHS.some((p) => pathname.startsWith(p));
}

/** User tapped Continue draft — discard saved draft if they leave flow without save/submit. */
export function beginDraftResume() {
  sessionStorage.setItem(DRAFT_SESSION_KEY, "1");
}

export function clearDraftResumeSession() {
  sessionStorage.removeItem(DRAFT_SESSION_KEY);
}

export function isDraftResumeSessionActive() {
  return sessionStorage.getItem(DRAFT_SESSION_KEY) === "1";
}

/** Leave flow without saving/submitting after resuming — drop the saved draft. */
export function abandonDraftIfNeeded(pathname: string, userId?: string) {
  if (isGrievanceFlowPath(pathname) || !isDraftResumeSessionActive()) return false;
  clearGrievanceDraft(userId);
  clearDraftResumeSession();
  return true;
}

export function saveGrievanceDraft(draft: Omit<GrievanceDraft, "savedAt">, userId?: string) {
  const payload: GrievanceDraft = { ...draft, savedAt: new Date().toISOString() };
  localStorage.setItem(draftKey(userId), JSON.stringify(payload));
  return payload;
}

export function loadGrievanceDraft(userId?: string): GrievanceDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as GrievanceDraft;
  } catch {
    return null;
  }
}

export function clearGrievanceDraft(userId?: string) {
  localStorage.removeItem(draftKey(userId));
}

export function getDraftContinueRoute(draft: GrievanceDraft) {
  const base = { form: draft.form, isFromQR: draft.isFromQR ?? false };
  switch (draft.step) {
    case "review":
      return { pathname: "/user/review-submit", state: base };
    case "checklist":
      return { pathname: "/user/document-checklist", state: base };
    default:
      return { pathname: "/user/raise-grievance", state: base };
  }
}

export function getDraftStepLabel(step: GrievanceDraftStep) {
  switch (step) {
    case "review":
      return "Review & Submit";
    case "checklist":
      return "Document checklist";
    default:
      return "Raise grievance";
  }
}
