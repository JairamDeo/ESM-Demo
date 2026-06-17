import mongoose, { Document, Schema } from "mongoose";

export interface IDocumentChecklistItem {
  label: string;
  text: string;
  textHi?: string;
  isMandatory: boolean;
  sortOrder: number;
  templateUrl?: string;
  templateFileName?: string;
}

export interface ICaseTypeRequiredDocuments extends Document {
  caseType: mongoose.Types.ObjectId;
  caseTypeSlug: string;
  caseTypeName: string;
  categoryId?: mongoose.Types.ObjectId;
  categoryName?: string;
  documents: IDocumentChecklistItem[];
  /** Admin-defined custom text fields (veteran filing). Not pre-seeded. */
  questions: string[];
  questionsHi?: string[];
  guidelines: string[];
  guidelinesHi?: string[];
  note?: string;
  noteHi?: string;
  acceptedFormats: string;
  maxFileSizeMb: number;
  isActive: boolean;
  createdBy?: { id: string; name?: string; email?: string; role?: string };
  updatedBy?: { id: string; name?: string; email?: string; role?: string };
  createdAt: Date;
  updatedAt: Date;
}

const documentItemSchema = new Schema<IDocumentChecklistItem>(
  {
    label: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    textHi: { type: String, trim: true },
    isMandatory: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    templateUrl: { type: String },
    templateFileName: { type: String },
  },
  { _id: false }
);

const CaseTypeRequiredDocumentsSchema = new Schema<ICaseTypeRequiredDocuments>(
  {
    caseType: { type: Schema.Types.ObjectId, ref: "CaseType", required: true, unique: true },
    caseTypeSlug: { type: String, required: true, trim: true, index: true },
    caseTypeName: { type: String, required: true, trim: true, index: true },
    caseTypeNameHi: { type: String, default: "" },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    categoryName: { type: String, trim: true },
    categoryNameHi: { type: String, default: "" },
    documents: { type: [documentItemSchema], default: [] },
    questions: { type: [String], default: [] },
    questionsHi: { type: [String], default: [] },
    guidelines: { type: [String], default: [] },
    guidelinesHi: { type: [String], default: [] },
    note: { type: String, default: "" },
    noteHi: { type: String, default: "" },
    acceptedFormats: { type: String, default: "PDF, JPG, JPEG, PNG" },
    maxFileSizeMb: { type: Number, default: 5, min: 1, max: 20 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    updatedBy: {
      id: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICaseTypeRequiredDocuments>(
  "CaseTypeRequiredDocuments",
  CaseTypeRequiredDocumentsSchema
);
