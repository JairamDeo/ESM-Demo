import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  loadGrievanceDraft,
  abandonDraftIfNeeded,
  type GrievanceDraft,
} from "@/lib/grievanceDraft";

/** Draft for Home/Services banner — clears if user resumed then left without save/submit. */
export function useGrievanceDraft(userId?: string) {
  const location = useLocation();
  const [draft, setDraft] = useState<GrievanceDraft | null>(() => loadGrievanceDraft(userId));

  useEffect(() => {
    abandonDraftIfNeeded(location.pathname, userId);
    setDraft(loadGrievanceDraft(userId));
  }, [location.pathname, userId]);

  return draft;
}
