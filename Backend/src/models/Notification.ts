import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  recipientType: "user" | "admin";
  title: string;
  message: string;
  type: "grievance_update" | "escalation" | "assignment" | "resolved" | "system";
  grievanceId?: mongoose.Types.ObjectId;
  grievanceCode?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, required: true },
    recipientType: { type: String, enum: ["user", "admin"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["grievance_update", "escalation", "assignment", "resolved", "system"],
      default: "system",
    },
    grievanceId: { type: Schema.Types.ObjectId, ref: "Grievance" },
    grievanceCode: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, recipientType: 1, isRead: 1, createdAt: -1, });

export default mongoose.model<INotification>("Notification", NotificationSchema);
