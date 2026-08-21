import { Schema } from "mongoose";
import { OFFICER_LEVELS } from "../constants/officerLevels";

/** Reverse mapping of an officer onto Station / HQ / Area. */
export const orgOfficerRefSchema = new Schema(
  {
    officerId: { type: Schema.Types.ObjectId, ref: "Officer", required: true },
    role: { type: String, required: true, trim: true },
    level: { type: String, enum: OFFICER_LEVELS },
  },
  { _id: false }
);
