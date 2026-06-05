import mongoose, { Document, Schema } from "mongoose";

export interface IPushSubscription extends Document {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId: mongoose.Types.ObjectId;
  userType: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userId: { type: Schema.Types.ObjectId, required: true },
    userType: { type: String, enum: ["user", "admin"], required: true },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ userId: 1, userType: 1 });

export default mongoose.model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
