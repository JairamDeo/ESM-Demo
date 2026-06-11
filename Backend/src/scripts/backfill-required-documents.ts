/**
 * Upserts official Identity & Personal required-document checklists (casetype1–6).
 * Safe to run on existing DB — updates matching slugs, creates missing rows.
 *
 * Usage: npm run backfill:required-docs
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import CaseType from "../models/CaseType";
import Category from "../models/Category";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
void Category;
import { IDENTITY_PERSONAL_REQUIRED_DOCUMENTS_RESOLVED } from "../constants/identityPersonalRequiredDocuments";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB");

  let created = 0;
  let updated = 0;

  const clearQuestions = process.argv.includes("--clear-questions");

  for (const entry of IDENTITY_PERSONAL_REQUIRED_DOCUMENTS_RESOLVED) {
    const caseType = await CaseType.findOne({ id: entry.caseTypeSlug }).populate("category", "name");
    if (!caseType) {
      console.warn(`  Skip — case type not found: ${entry.caseTypeSlug}`);
      continue;
    }

    const category = caseType.category as any;
    const payload: Record<string, unknown> = {
      caseType: caseType._id,
      caseTypeSlug: caseType.id,
      caseTypeName: caseType.name,
      categoryId: category?._id ?? caseType.category,
      categoryName: category?.name ?? "Identity & Personal",
      documents: entry.documents.map((d) => ({
        label: d.label,
        text: d.text,
        isMandatory: d.isMandatory !== false,
        sortOrder: d.sortOrder,
      })),
      guidelines: entry.guidelines ?? [],
      note: entry.note ?? "",
      acceptedFormats: "PDF, JPG, JPEG, PNG",
      maxFileSizeMb: 5,
      isActive: true,
      updatedBy: { id: "backfill", name: "Backfill Script", role: "System" },
    };

    const existing = await CaseTypeRequiredDocuments.findOne({ caseType: caseType._id });
    if (existing) {
      Object.assign(existing, payload);
      if (clearQuestions) existing.questions = [];
      await existing.save();
      updated++;
      console.log(`  Updated: ${caseType.name}`);
    } else {
      await CaseTypeRequiredDocuments.create({
        ...payload,
        questions: [],
        createdBy: { id: "backfill", name: "Backfill Script", role: "System" },
      });
      created++;
      console.log(`  Created: ${caseType.name}`);
    }
  }

  console.log(`Done — ${created} created, ${updated} updated`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
