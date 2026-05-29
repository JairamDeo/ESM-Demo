// import mongoose, { Document, Schema } from "mongoose";

// export interface IOfficer extends Document {
//   _id: mongoose.Types.ObjectId;
//   name: string;
//   rank: string;
//   role: "ESM Officer" | "Station HQ Officer" | "Record Office";
//   stationId?: mongoose.Types.ObjectId;
//   stationName: string;
//   email: string;
//   phone?: string;
//   activeCases: number;
//   totalCasesHandled: number;
//   status: "active" | "inactive";
//   adminRef?: mongoose.Types.ObjectId;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const OfficerSchema = new Schema<IOfficer>(
//   {
//     name: { type: String, required: true, trim: true },
//     rank: { type: String, trim: true, default: "" },
//     role: {
//       type: String,
//       enum: ["ESM Officer", "Station HQ Officer", "Record Office"],
//       required: true,
//     },
//     stationId: { type: Schema.Types.ObjectId, ref: "Station" },
//     stationName: { type: String, required: true },
//     email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//     phone: { type: String },
//     activeCases: { type: Number, default: 0, min: 0 },
//     totalCasesHandled: { type: Number, default: 0, min: 0 },
//     status: { type: String, enum: ["active", "inactive"], default: "active" },
//     adminRef: { type: Schema.Types.ObjectId, ref: "Admin" },
//   },
//   { timestamps: true }
// );

// export default mongoose.model<IOfficer>("Officer", OfficerSchema);





import mongoose, { Document, Schema } from "mongoose";

export interface IOfficer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  rank: string;
  role: "ESM Officer" | "Station HQ Officer" | "Record Office";
  station: mongoose.Types.ObjectId;   // ← now a ref to Station
  stationName: string;                // ← cached for quick display
  email: string;
  phone?: string;
  activeCases: number;
  totalCasesHandled: number;
  status: "active" | "inactive";
  adminRef?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerSchema = new Schema<IOfficer>(
  {
    name:  { type: String, required: true, trim: true },
    rank:  { type: String, trim: true, default: "" },
    role:  {
      type: String,
      enum: ["ESM Officer", "Station HQ Officer", "Record Office"],
      required: true,
    },
    station:     { type: Schema.Types.ObjectId, ref: "Station", required: true }, // ← ref
    stationName: { type: String, required: true },  // ← cached
    email:  { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:  { type: String },
    activeCases:       { type: Number, default: 0, min: 0 },
    totalCasesHandled: { type: Number, default: 0, min: 0 },
    status:   { type: String, enum: ["active", "inactive"], default: "active" },
    adminRef: { type: Schema.Types.ObjectId, ref: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.model<IOfficer>("Officer", OfficerSchema);