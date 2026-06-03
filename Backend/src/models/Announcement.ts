import mongoose, { Document, Schema } from "mongoose";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  targetStations: mongoose.Types.ObjectId[];
  sentViaSMS: boolean;
  sentViaPush: boolean;
  createdBy: string;
  hqId?: mongoose.Types.ObjectId; // Which HQ sent it (if applicable)
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    targetStations: [{ type: Schema.Types.ObjectId, ref: "Station" }],
    sentViaSMS: { type: Boolean, default: false },
    sentViaPush: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
    hqId: { type: Schema.Types.ObjectId, ref: "HQ" },
  },
  { timestamps: true }
);

export default mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);
