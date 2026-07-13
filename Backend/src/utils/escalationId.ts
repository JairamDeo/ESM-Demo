import Escalation from "../models/Escalation";

const ESCALATION_ID_PATTERN = /^ESC-(\d+)$/i;

async function maxEscalationNumber(): Promise<number> {
  const [row] = await Escalation.aggregate([
    { $match: { escalationId: { $regex: /^ESC-\d+$/i } } },
    {
      $project: {
        num: {
          $toInt: {
            $arrayElemAt: [{ $split: ["$escalationId", "-"] }, 1],
          },
        },
      },
    },
    { $group: { _id: null, maxNum: { $max: "$num" } } },
  ]);
  return typeof row?.maxNum === "number" ? row.maxNum : 0;
}

function formatEscalationId(num: number): string {
  return `ESC-${String(num).padStart(3, "0")}`;
}

function incrementEscalationId(current: string): string {
  const match = current.match(ESCALATION_ID_PATTERN);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return formatEscalationId(next);
}

/** Next unique escalation code based on highest existing ESC-### (not document count). */
export async function nextEscalationId(): Promise<string> {
  const maxNum = await maxEscalationNumber();
  return formatEscalationId(maxNum + 1);
}

/** Create escalation record; retries if escalationId collides (concurrent writers). */
export async function createEscalationRecord(
  data: Record<string, unknown>
): Promise<InstanceType<typeof Escalation>> {
  const maxAttempts = 8;
  let candidateId = await nextEscalationId();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await Escalation.create({
        ...data,
        escalationId: candidateId,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000 && attempt < maxAttempts - 1) {
        candidateId = incrementEscalationId(candidateId);
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to allocate a unique escalation ID");
}
