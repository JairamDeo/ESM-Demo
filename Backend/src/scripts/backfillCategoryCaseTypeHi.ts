/**
 * Backfill Hindi fields for existing categories and case types
 * that were created before nameHi / descriptionHi was saved.
 *
 * Run: npm run backfill:category-casetype-hi
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Category from "../models/Category";
import CaseType from "../models/CaseType";
import { detectAndTranslateToOpposite } from "../services/translateService";

const DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isBlank(value?: string | null) {
  return !value || !String(value).trim();
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB\n");

  let categoriesUpdated = 0;
  let caseTypesUpdated = 0;

  const categories = await Category.find({
    $or: [{ nameHi: { $exists: false } }, { nameHi: "" }, { nameHi: null }],
  }).sort({ name: 1 });

  console.log(`📁 Categories to backfill: ${categories.length}`);

  for (const category of categories) {
    if (!category.name?.trim()) continue;

    const xlat = await detectAndTranslateToOpposite(category.name.trim());
    if (xlat.translationFailed) {
      console.warn(`⚠️  Category "${category.name}" — translation failed, skipped`);
      await sleep(DELAY_MS);
      continue;
    }

    category.nameHi = xlat.translatedText;
    await category.save();
    categoriesUpdated++;
    console.log(`  ✓ ${category.name} → ${category.nameHi}`);
    await sleep(DELAY_MS);
  }

  const caseTypes = await CaseType.find({
    $or: [
      { nameHi: { $exists: false } },
      { nameHi: "" },
      { nameHi: null },
      { descriptionHi: { $exists: false } },
      { descriptionHi: "" },
      { descriptionHi: null },
    ],
  }).sort({ name: 1 });

  console.log(`\n📋 Case types to backfill: ${caseTypes.length}`);

  for (const caseType of caseTypes) {
    let changed = false;

    if (isBlank(caseType.nameHi) && caseType.name?.trim()) {
      const xlatName = await detectAndTranslateToOpposite(caseType.name.trim());
      if (xlatName.translationFailed) {
        console.warn(`⚠️  Case type "${caseType.name}" name — translation failed`);
      } else {
        caseType.nameHi = xlatName.translatedText;
        changed = true;
      }
      await sleep(DELAY_MS);
    }

    if (isBlank(caseType.descriptionHi) && caseType.description?.trim()) {
      const xlatDesc = await detectAndTranslateToOpposite(caseType.description.trim());
      if (xlatDesc.translationFailed) {
        console.warn(`⚠️  Case type "${caseType.name}" description — translation failed`);
      } else {
        caseType.descriptionHi = xlatDesc.translatedText;
        changed = true;
      }
      await sleep(DELAY_MS);
    } else if (isBlank(caseType.descriptionHi) && isBlank(caseType.description)) {
      caseType.descriptionHi = "";
      changed = true;
    }

    if (changed) {
      await caseType.save();
      caseTypesUpdated++;
      console.log(
        `  ✓ ${caseType.name}` +
          (caseType.nameHi ? ` → ${caseType.nameHi}` : "") +
          (caseType.descriptionHi ? ` | ${caseType.descriptionHi}` : "")
      );
    }
  }

  console.log("\n════════════════════════════════════════");
  console.log(`✅ Categories updated: ${categoriesUpdated}`);
  console.log(`✅ Case types updated: ${caseTypesUpdated}`);
  console.log("════════════════════════════════════════\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ backfill:category-casetype-hi failed:", err);
  process.exit(1);
});
