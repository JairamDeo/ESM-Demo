import mongoose, { Document, Schema } from "mongoose";

export interface IHQStationRef {
  stationId: mongoose.Types.ObjectId;
  stationName: string;
}

export interface IHQ extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  state: string;
  address?: string;
  commanderName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** Active station HQs under this headquarters. */
  stations: IHQStationRef[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HQSchema = new Schema<IHQ>(
  {
    name:          { type: String, required: true, unique: true, trim: true },
    city:          { type: String, required: true, trim: true },
    state:         { type: String, required: true, trim: true },
    address:       { type: String },
    commanderName: { type: String },
    contactEmail:  { type: String, lowercase: true },
    contactPhone:  { type: String },
    stations: [
      {
        stationId:   { type: Schema.Types.ObjectId, ref: "Station", required: true },
        stationName: { type: String, required: true, trim: true },
      },
    ],
    isActive:      { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IHQ>("HQ", HQSchema);