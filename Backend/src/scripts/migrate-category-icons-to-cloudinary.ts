/**
 * One-time migration: upload legacy /uploads/category-master/* icons to Cloudinary
 * and update Category.iconUrl to the secure Cloudinary URL.
 *
 * Usage: npm run migrate:category-icons
 */
import "../config/env";
import connectDB from "../config/database";
import Category from "../models/Category";
import {
  readLocalCategoryIconBuffer,
  removeCategoryIcon,
  storeCategoryIcon,
  verifyCloudinaryConnection,
} from "../services/storageService";
import { isRemoteStorageUrl } from "../services/cloudinaryService";

async function main() {
  await connectDB();
  await verifyCloudinaryConnection();

  const categories = await Category.find({
    iconUrl: { $exists: true, $nin: [null, ""] },
  });

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const category of categories) {
    const iconUrl = category.iconUrl!;
    if (isRemoteStorageUrl(iconUrl)) {
      console.log(`⏭️  ${category.name}: already on Cloudinary`);
      skipped++;
      continue;
    }

    const buffer = readLocalCategoryIconBuffer(iconUrl);
    if (!buffer) {
      console.warn(`⚠️  ${category.name}: local file missing (${iconUrl})`);
      failed++;
      continue;
    }

    try {
      const stored = await storeCategoryIcon(buffer, `${category._id}-icon`, "image/webp");
      await removeCategoryIcon(iconUrl);
      category.iconUrl = stored.url;
      await category.save();
      console.log(`✅ ${category.name}: ${stored.url}`);
      migrated++;
    } catch (err: any) {
      console.error(`❌ ${category.name}: ${err?.message || err}`);
      failed++;
    }
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} failed=${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
