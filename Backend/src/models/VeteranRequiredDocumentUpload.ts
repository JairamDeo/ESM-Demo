import mongoose, { Document, Schema } from "mongoose";

export interface IVeteranRequiredDocumentUpload extends Document {
  userId: mongoose.Types.ObjectId;
  veteranKey: string;
  caseType: mongoose.Types.ObjectId;
  caseTypeSlug: string;
  caseTypeName: string;
  categoryName: string;
  documentLabel: string;
  documentSortOrder: number;
  originalFileName: string;
  storedPath: string;
  mimeType: string;
  fileSize: number;
  grievanceId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VeteranRequiredDocumentUploadSchema = new Schema<IVeteranRequiredDocumentUpload>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    veteranKey: { type: String, required: true, index: true },
    caseType: { type: Schema.Types.ObjectId, ref: "CaseType", required: true },
    caseTypeSlug: { type: String, required: true },
    caseTypeName: { type: String, required: true },
    categoryName: { type: String, default: "" },
    documentLabel: { type: String, required: true },
    documentSortOrder: { type: Number, default: 0 },
    originalFileName: { type: String, required: true },
    storedPath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    grievanceId: { type: Schema.Types.ObjectId, ref: "Grievance" },
  },
  { timestamps: true }
);

VeteranRequiredDocumentUploadSchema.index(
  { userId: 1, caseTypeSlug: 1, documentLabel: 1 },
  { unique: true, partialFilterExpression: { grievanceId: { $exists: false } } }
);

export default mongoose.model<IVeteranRequiredDocumentUpload>(
  "VeteranRequiredDocumentUpload",
  VeteranRequiredDocumentUploadSchema
);
