import Escalation from "../models/Escalation";

const ESCALATION_ID_PATTERN = /^ESC-(\d+)$/;

/** Next unique escalation code based on highest existing ESC-### (not document count). */
export async function nextEscalationId(): Promise<string> {
  const docs = await Escalation.find({ escalationId: /^ESC-\d+$/ })
    .select("escalationId")
    .lean();

  let maxNum = 0;
  for (const doc of docs) {
    const match = doc.escalationId.match(ESCALATION_ID_PATTERN);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }

  return `ESC-${String(maxNum + 1).padStart(3, "0")}`;
}

/** Create escalation record; retries if escalationId collides (concurrent writers). */
export async function createEscalationRecord(
  data: Record<string, unknown>
): Promise<InstanceType<typeof Escalation>> {
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await Escalation.create({
        ...data,
        escalationId: await nextEscalationId(),
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000 && attempt < maxAttempts - 1) continue;
      throw err;
    }
  }

  throw new Error("Failed to allocate a unique escalation ID");
}
