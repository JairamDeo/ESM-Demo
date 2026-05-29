// import mongoose, { Document, Schema } from "mongoose";

// export interface IStation extends Document {
//   _id: mongoose.Types.ObjectId;
//   name: string;
//   city: string;
//   state: string;
//   address?: string;
//   officerCount: number;
//   totalCases: number;
//   resolvedCases: number;
//   qrActive: boolean;
//   qrCode?: string;
//   contactEmail?: string;
//   contactPhone?: string;
//   isActive: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const StationSchema = new Schema<IStation>(
//   {
//     name: { type: String, required: true, unique: true, trim: true },
//     city: { type: String, required: true, trim: true },
//     state: { type: String, required: true, trim: true },
//     address: { type: String },
//     officerCount: { type: Number, default: 0, min: 0 },
//     totalCases: { type: Number, default: 0, min: 0 },
//     resolvedCases: { type: Number, default: 0, min: 0 },
//     qrActive: { type: Boolean, default: false },
//     qrCode: { type: String },
//     contactEmail: { type: String, lowercase: true },
//     contactPhone: { type: String },
//     isActive: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// // Virtual: resolution rate
// StationSchema.virtual("resolutionRate").get(function () {
//   if (this.totalCases === 0) return 0;
//   return Math.round((this.resolvedCases / this.totalCases) * 100);
// });

// StationSchema.set("toJSON", { virtuals: true });

// export default mongoose.model<IStation>("Station", StationSchema);







import mongoose, { Document, Schema } from "mongoose";

export interface IStation extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  hqId?:    mongoose.Types.ObjectId;
  hqName?:  string;
  state: mongoose.Types.ObjectId;    // ← now a ref to State
  stateCode?: string;                // ← cached for quick access
  stateName?: string;                // ← cached for display
  address?: string;
  officerCount: number;
  totalCases: number;
  resolvedCases: number;
  qrActive: boolean;
  qrCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StationSchema = new Schema<IStation>(
  {
    name:     { type: String, required: true, unique: true, trim: true },
    city:     { type: String, required: true, trim: true },
    hqId:     { type: Schema.Types.ObjectId, ref: "HQ" },       // ← HQ ref
    hqName:   { type: String },                                   // ← cached
    state:    { type: Schema.Types.ObjectId, ref: "State", required: true },
    stateCode:{ type: String },
    stateName:{ type: String },
    address:  { type: String },
    officerCount:  { type: Number, default: 0, min: 0 },
    totalCases:    { type: Number, default: 0, min: 0 },
    resolvedCases: { type: Number, default: 0, min: 0 },
    qrActive:  { type: Boolean, default: false },
    qrCode:    { type: String },
    contactEmail: { type: String, lowercase: true },
    contactPhone: { type: String },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

StationSchema.virtual("resolutionRate").get(function () {
  if (this.totalCases === 0) return 0;
  return Math.round((this.resolvedCases / this.totalCases) * 100);
});

StationSchema.set("toJSON", { virtuals: true });

export default mongoose.model<IStation>("Station", StationSchema);