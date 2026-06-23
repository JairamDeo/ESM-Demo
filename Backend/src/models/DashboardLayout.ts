import mongoose, { Document, Schema } from "mongoose";

export interface IWidget {
  id: string;
  widgetKey: string;
  chartType: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export interface IDashboardLayout extends Document {
  userId: mongoose.Types.ObjectId;
  dashboardName?: string;
  widgets: IWidget[];
}

const WidgetSchema = new Schema<IWidget>({
  id: { type: String, required: true },
  widgetKey: { type: String, required: true },
  chartType: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  w: { type: Number, required: true },
  h: { type: Number, required: true },
  minW: { type: Number, required: true },
  minH: { type: Number, required: true },
}, { _id: false });

const DashboardLayoutSchema = new Schema<IDashboardLayout>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  dashboardName: { type: String, default: "My Dashboard" },
  widgets: { type: [WidgetSchema], default: [] },
}, { timestamps: true });

export default mongoose.model<IDashboardLayout>("DashboardLayout", DashboardLayoutSchema);
