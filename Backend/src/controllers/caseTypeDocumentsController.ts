import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import CaseType from "../models/CaseType";
import CaseTypeRequiredDocuments, { IDocumentChecklistItem } from "../models/CaseTypeRequiredDocuments";

function actorMeta(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.jobRole || user.role,
  };
}

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function resolveCaseType(key: string) {
  const trimmed = key.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const byId = await CaseType.findById(trimmed).populate("category", "name");
    if (byId) return byId;
  }
  const bySlug = await CaseType.findOne({ id: { $regex: `^${trimmed}$`, $options: "i" } }).populate(
    "category",
    "name"
  );
  if (bySlug) return bySlug;
  return CaseType.findOne({ name: { $regex: `^${trimmed}$`, $options: "i" } }).populate("category", "name");
}

function formatChecklist(doc: any, caseType?: any) {
  const json = doc?.toJSON ? doc.toJSON() : doc;
  return {
    caseTypeId: json.caseType?.toString?.() ?? json.caseType,
    caseTypeSlug: json.caseTypeSlug,
    caseTypeName: json.caseTypeName,
    categoryId: json.categoryId,
    categoryName: json.categoryName,
    description: caseType?.description ?? "",
    documents: (json.documents || []).sort(
      (a: IDocumentChecklistItem, b: IDocumentChecklistItem) => a.sortOrder - b.sortOrder
    ),
    questions: json.questions || [],
    guidelines: json.guidelines || [],
    note: json.note || "",
    acceptedFormats: json.acceptedFormats || "PDF, JPG, JPEG, PNG",
    maxFileSizeMb: json.maxFileSizeMb ?? 5,
    isActive: json.isActive !== false,
    updatedAt: json.updatedAt,
  };
}

function normalizeDocuments(raw: unknown): IDocumentChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, index: number) => ({
    label: String(item.label || String.fromCharCode(65 + index)).trim().toUpperCase(),
    text: String(item.text || "").trim(),
    isMandatory: item.isMandatory !== false,
    sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index,
    templateUrl: item.templateUrl || undefined,
    templateFileName: item.templateFileName || undefined,
  })).filter((d) => d.text.length > 0);
}

/** Admin — list all case types with checklist status. */
export const listCaseTypeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseTypes = await CaseType.find({ isActive: { $ne: false } })
      .populate("category", "name")
      .sort({ id: 1 })
      .lean();

    const checklists = await CaseTypeRequiredDocuments.find().lean();
    const byCaseType = new Map(checklists.map((c) => [String(c.caseType), c]));

    const data = caseTypes.map((ct) => {
      const checklist = byCaseType.get(String(ct._id));
      return {
        caseTypeId: ct._id,
        caseTypeSlug: ct.id,
        caseTypeName: ct.name,
        description: ct.description,
        categoryId: ct.category?._id ?? ct.category,
        categoryName: (ct.category as any)?.name ?? "",
        hasChecklist: !!checklist,
        documentCount: checklist?.documents?.length ?? 0,
        isActive: checklist?.isActive !== false,
        checklist: checklist ? formatChecklist(checklist, ct) : null,
      };
    });

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Veteran + admin — GET checklist by case type id, slug, or name (query). */
export const getRequiredDocumentsForCaseType = async (req: Request, res: Response): Promise<void> => {
  try {
    const key =
      paramString(req.query.caseTypeId as string | string[]) ||
      paramString(req.query.slug as string | string[]) ||
      paramString(req.query.name as string | string[]) ||
      paramString(req.params.key);

    if (!key) {
      res.status(400).json({
        success: false,
        message: "Provide caseTypeId, slug, or name query parameter",
      });
      return;
    }

    const caseType = await resolveCaseType(key);
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const doc = await CaseTypeRequiredDocuments.findOne({
      caseType: caseType._id,
      isActive: { $ne: false },
    });

    if (!doc || !doc.documents?.length) {
      res.status(200).json({
        success: true,
        data: {
          caseTypeId: caseType._id,
          caseTypeSlug: caseType.id,
          caseTypeName: caseType.name,
          categoryName: (caseType.category as any)?.name ?? "",
          description: caseType.description,
          documents: [],
          questions: [],
          guidelines: [],
          note: "",
          acceptedFormats: "PDF, JPG, JPEG, PNG",
          maxFileSizeMb: 5,
          isActive: false,
        },
      });
      return;
    }

    res.json({ success: true, data: formatChecklist(doc, caseType) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Admin — create or update checklist for a case type. */
export const upsertCaseTypeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseType = await resolveCaseType(paramString(req.params.caseTypeId));
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const actor = (req as any).user;
    const documents = normalizeDocuments(req.body.documents);
    const guidelines = Array.isArray(req.body.guidelines)
      ? req.body.guidelines.map((g: string) => String(g).trim()).filter(Boolean)
      : undefined;
    const questions = Array.isArray(req.body.questions)
      ? req.body.questions.map((q: string) => String(q).trim()).filter(Boolean)
      : undefined;

    const category = caseType.category as any;
    const payload: Record<string, unknown> = {
      caseType: caseType._id,
      caseTypeSlug: caseType.id,
      caseTypeName: caseType.name,
      categoryId: category?._id ?? caseType.category,
      categoryName: category?.name ?? "",
      documents,
      updatedBy: actorMeta(actor),
    };

    if (guidelines !== undefined) payload.guidelines = guidelines;
    if (questions !== undefined) payload.questions = questions;
    if (req.body.note !== undefined) payload.note = String(req.body.note).trim();
    if (req.body.acceptedFormats !== undefined) payload.acceptedFormats = String(req.body.acceptedFormats).trim();
    if (req.body.maxFileSizeMb !== undefined) payload.maxFileSizeMb = Number(req.body.maxFileSizeMb) || 5;
    if (req.body.isActive !== undefined) payload.isActive = !!req.body.isActive;

    const existing = await CaseTypeRequiredDocuments.findOne({ caseType: caseType._id });
    let saved;
    if (existing) {
      Object.assign(existing, payload);
      saved = await existing.save();
    } else {
      saved = await CaseTypeRequiredDocuments.create({
        ...payload,
        createdBy: actorMeta(actor),
      });
    }

    res.status(200).json({
      success: true,
      message: "Required documents saved",
      data: formatChecklist(saved, caseType),
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/** Admin — upload PDF template for a document item. */
export const uploadDocumentTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseType = await resolveCaseType(paramString(req.params.caseTypeId));
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const itemIndex = parseInt(String(req.body.itemIndex ?? paramString(req.params.itemIndex)), 10);
    if (Number.isNaN(itemIndex) || itemIndex < 0) {
      res.status(400).json({ success: false, message: "Valid itemIndex is required" });
      return;
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ success: false, message: "PDF file is required" });
      return;
    }

    const doc = await CaseTypeRequiredDocuments.findOne({ caseType: caseType._id });
    if (!doc || !doc.documents[itemIndex]) {
      res.status(404).json({ success: false, message: "Document item not found — save checklist first" });
      return;
    }

    const uploadDir = path.join(__dirname, "../../uploads/case-type-templates", caseType.id);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${itemIndex}-${Date.now()}-${safeName}`;
    await fs.promises.writeFile(path.join(uploadDir, filename), file.buffer);

    const templateUrl = `/uploads/case-type-templates/${caseType.id}/${filename}`;
    doc.documents[itemIndex].templateUrl = templateUrl;
    doc.documents[itemIndex].templateFileName = file.originalname;
    doc.updatedBy = actorMeta((req as any).user);
    await doc.save();

    res.json({
      success: true,
      message: "Template uploaded",
      data: {
        itemIndex,
        templateUrl,
        templateFileName: file.originalname,
        checklist: formatChecklist(doc, caseType),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Admin — remove template from a document item. */
export const removeDocumentTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const caseType = await resolveCaseType(paramString(req.params.caseTypeId));
    if (!caseType) {
      res.status(404).json({ success: false, message: "Case type not found" });
      return;
    }

    const itemIndex = parseInt(paramString(req.params.itemIndex), 10);
    const doc = await CaseTypeRequiredDocuments.findOne({ caseType: caseType._id });
    if (!doc || !doc.documents[itemIndex]) {
      res.status(404).json({ success: false, message: "Document item not found" });
      return;
    }

    const oldUrl = doc.documents[itemIndex].templateUrl;
    if (oldUrl?.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, "../..", oldUrl);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch {
          /* ignore */
        }
      }
    }

    doc.documents[itemIndex].templateUrl = undefined;
    doc.documents[itemIndex].templateFileName = undefined;
    doc.updatedBy = actorMeta((req as any).user);
    await doc.save();

    res.json({ success: true, message: "Template removed", data: formatChecklist(doc, caseType) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
