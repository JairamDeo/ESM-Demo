import Escalation from "../models/Escalation";

interface EscalationCounter {
  _id: string;
  seq: number;
}

const COUNTER_ID = "escalationId";

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

/**
 * Allocate the next escalation number atomically.
 *
 * The max sync keeps the counter compatible with legacy/seeded escalation
 * records, while findOneAndUpdate prevents concurrent requests from receiving
 * the same number.
 */
export async function nextEscalationId(): Promise<string> {
  const maxNum = await maxEscalationNumber();
  const counters =
    Escalation.db.collection<EscalationCounter>("sequence_counters");

  await counters.updateOne(
    { _id: COUNTER_ID },
    { $max: { seq: maxNum } },
    { upsert: true }
  );

  const counter = await counters.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { returnDocument: "after" }
  );

  if (!counter) {
    throw new Error("Failed to allocate an escalation ID");
  }
  return formatEscalationId(counter.seq);
}

/** Create escalation record; retry safely around legacy or external writers. */
export async function createEscalationRecord(
  data: Record<string, unknown>
): Promise<InstanceType<typeof Escalation>> {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidateId = await nextEscalationId();
    try {
      return await Escalation.create({
        ...data,
        escalationId: candidateId,
      });
    } catch (err: unknown) {
      const duplicate = err as {
        code?: number;
        keyPattern?: Record<string, number>;
        keyValue?: Record<string, unknown>;
      };
      const isEscalationIdCollision =
        duplicate.code === 11000 &&
        (duplicate.keyPattern?.escalationId === 1 ||
          Object.prototype.hasOwnProperty.call(
            duplicate.keyValue || {},
            "escalationId"
          ));
      if (isEscalationIdCollision && attempt < maxAttempts - 1) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to allocate a unique escalation ID");
}
