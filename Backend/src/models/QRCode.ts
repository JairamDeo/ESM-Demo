import mongoose, { Document, Schema } from "mongoose";

export interface IQRCode extends Document {
  _id: mongoose.Types.ObjectId;
  stationId: mongoose.Types.ObjectId;
  stationName: string;
  code: string;               // e.g. NAG-QR-001
  qrData: string;             // full URL/data encoded in QR
  svgContent?: string;        // stored SVG
  totalScans: number;
  lastScannedAt?: Date;
  status: "active" | "inactive" | "regenerated";
  generatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema = new Schema<IQRCode>(
  {
    stationId: { type: Schema.Types.ObjectId, ref: "Station", required: true },
    stationName: { type: String, required: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    qrData: { type: String, required: true },
    svgContent: { type: String },
    totalScans: { type: Number, default: 0, min: 0 },
    lastScannedAt: { type: Date },
    status: { type: String, enum: ["active", "inactive", "regenerated"], default: "active" },
    generatedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.model<IQRCode>("QRCode", QRCodeSchema);
