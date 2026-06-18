/**
 * Migrate legacy /uploads/... paths in MongoDB to Cloudinary URLs.
 *
 * Run: npm run migrate:local-uploads
 */
import fs from "fs";
import path from "path";
import "../config/env";
import connectDB from "../config/database";
import Category from "../models/Category";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
import VeteranRequiredDocumentUpload from "../models/VeteranRequiredDocumentUpload";
import Grievance from "../models/Grievance";
import {
  readLocalUploadBuffer,
  storeCategoryIcon,
  storeUploadedBuffer,
  verifyCloudinaryConnection,
} from "../services/storageService";
import { isRemoteStorageUrl } from "../services/cloudinaryService";
import { deleteStoredAsset } from "../services/storageResolver";

function isLocalUpload(url?: string | null): url is string {
  return !!url && url.startsWith("/uploads/");
}

function guessMime(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".webp") return "image/webp";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function folderFromLocalPath(localPath: string): string {
  const rel = localPath.replace(/^\/uploads\//, "");
  const parts = rel.split("/");
  parts.pop();
  return parts.join("/") || "legacy";
}

async function migrateLocalPath(localPath: string): Promise<string | null> {
  if (!isLocalUpload(localPath)) return null;

  const buffer = readLocalUploadBuffer(localPath);
  if (!buffer) {
    console.warn(`⚠️  Local file missing: ${localPath}`);
    return null;
  }

  const fileName = path.basename(localPath);
  const mimetype = guessMime(fileName);
  const folder = folderFromLocalPath(localPath);

  if (localPath.includes("/category-master/")) {
    const stored = await storeCategoryIcon(buffer, fileName.replace(/\.[^.]+$/, ""), mimetype);
    return stored.url;
  }

  const stored = await storeUploadedBuffer(buffer, { folder, fileName, mimetype });
  return stored.url;
}

async function migrateUrlField(
  label: string,
  localPath: string,
  onSuccess: (newUrl: string) => Promise<void>
): Promise<"migrated" | "skipped" | "failed"> {
  if (!isLocalUpload(localPath)) return "skipped";

  try {
    const newUrl = await migrateLocalPath(localPath);
    if (!newUrl) return "failed";
    await onSuccess(newUrl);
    await deleteStoredAsset(localPath).catch(() => undefined);
    console.log(`✅ ${label}: ${localPath} → ${newUrl}`);
    return "migrated";
  } catch (err: any) {
    console.error(`❌ ${label}: ${err?.message || err}`);
    return "failed";
  }
}

async function main() {
  await connectDB();
  await verifyCloudinaryConnection();

  const stats = { migrated: 0, skipped: 0, failed: 0 };

  const bump = (result: "migrated" | "skipped" | "failed") => {
    stats[result]++;
  };

  // Categories
  const categories = await Category.find({ iconUrl: { $regex: "^/uploads/" } });
  console.log(`\n📁 Category icons: ${categories.length}`);
  for (const category of categories) {
    const result = await migrateUrlField(
      `Category "${category.name}"`,
      category.iconUrl!,
      async (newUrl) => {
        category.iconUrl = newUrl;
        await category.save();
      }
    );
    bump(result);
  }

  // Case type annexure templates
  const checklists = await CaseTypeRequiredDocuments.find({
    "documents.templateUrl": { $regex: "^/uploads/" },
  });
  console.log(`\n📋 Case type templates: ${checklists.length} doc(s)`);
  for (const doc of checklists) {
    let changed = false;
    for (let i = 0; i < doc.documents.length; i++) {
      const item = doc.documents[i];
      if (!isLocalUpload(item.templateUrl)) continue;
      const result = await migrateUrlField(
        `Template ${doc.caseTypeName} [${item.label}]`,
        item.templateUrl,
        async (newUrl) => {
          doc.documents[i].templateUrl = newUrl;
        }
      );
      bump(result);
      if (result === "migrated") changed = true;
    }
    if (changed) await doc.save();
  }

  // Veteran required document uploads
  const veteranUploads = await VeteranRequiredDocumentUpload.find({
    storedPath: { $regex: "^/uploads/" },
  });
  console.log(`\n📎 Veteran uploads: ${veteranUploads.length}`);
  for (const upload of veteranUploads) {
    const result = await migrateUrlField(
      `Veteran upload ${upload._id}`,
      upload.storedPath,
      async (newUrl) => {
        upload.storedPath = newUrl;
        await upload.save();
      }
    );
    bump(result);
  }

  // Grievance attachments (top-level, comments, timeline, replaced URLs)
  const grievances = await Grievance.find({
    $or: [
      { attachments: { $regex: "^/uploads/" } },
      { "comments.attachments": { $regex: "^/uploads/" } },
      { "timeline.attachments": { $regex: "^/uploads/" } },
      { "comments.replacedDocumentUrl": { $regex: "^/uploads/" } },
      { "timeline.replacedDocumentUrl": { $regex: "^/uploads/" } },
      { "comments.concernDocuments.replacedDocumentUrl": { $regex: "^/uploads/" } },
      { "timeline.concernDocuments.replacedDocumentUrl": { $regex: "^/uploads/" } },
    ],
  });

  console.log(`\n📄 Grievances with local files: ${grievances.length}`);
  for (const grievance of grievances) {
    let changed = false;

    if (grievance.attachments?.length) {
      const next: string[] = [];
      for (const url of grievance.attachments) {
        if (!isLocalUpload(url)) {
          next.push(url);
          continue;
        }
        const result = await migrateUrlField(`Grievance ${grievance.grievanceId} attachment`, url, async (newUrl) => {
          next.push(newUrl);
        });
        bump(result);
        if (result === "migrated") changed = true;
        else next.push(url);
      }
      if (changed) grievance.attachments = next;
    }

    for (const comment of grievance.comments || []) {
      if (isLocalUpload(comment.replacedDocumentUrl)) {
        const result = await migrateUrlField(
          `Grievance ${grievance.grievanceId} comment replaced doc`,
          comment.replacedDocumentUrl!,
          async (newUrl) => {
            comment.replacedDocumentUrl = newUrl;
          }
        );
        bump(result);
        if (result === "migrated") changed = true;
      }
      if (comment.attachments?.length) {
        const next: string[] = [];
        for (const url of comment.attachments) {
          if (!isLocalUpload(url)) {
            next.push(url);
            continue;
          }
          const result = await migrateUrlField(`Grievance ${grievance.grievanceId} comment attachment`, url, async (newUrl) => {
            next.push(newUrl);
          });
          bump(result);
          if (result === "migrated") changed = true;
          else next.push(url);
        }
        comment.attachments = next;
      }
      for (const cd of comment.concernDocuments || []) {
        if (!isLocalUpload(cd.replacedDocumentUrl)) continue;
        const result = await migrateUrlField(
          `Grievance ${grievance.grievanceId} concern doc`,
          cd.replacedDocumentUrl!,
          async (newUrl) => {
            cd.replacedDocumentUrl = newUrl;
          }
        );
        bump(result);
        if (result === "migrated") changed = true;
      }
    }

    for (const entry of grievance.timeline || []) {
      if (isLocalUpload(entry.replacedDocumentUrl)) {
        const result = await migrateUrlField(
          `Grievance ${grievance.grievanceId} timeline replaced doc`,
          entry.replacedDocumentUrl!,
          async (newUrl) => {
            entry.replacedDocumentUrl = newUrl;
          }
        );
        bump(result);
        if (result === "migrated") changed = true;
      }
      if (entry.attachments?.length) {
        const next: string[] = [];
        for (const url of entry.attachments) {
          if (!isLocalUpload(url)) {
            next.push(url);
            continue;
          }
          const result = await migrateUrlField(`Grievance ${grievance.grievanceId} timeline attachment`, url, async (newUrl) => {
            next.push(newUrl);
          });
          bump(result);
          if (result === "migrated") changed = true;
          else next.push(url);
        }
        entry.attachments = next;
      }
    }

    if (changed) {
      grievance.markModified("attachments");
      grievance.markModified("comments");
      grievance.markModified("timeline");
      await grievance.save();
    }
  }

  console.log("\n════════════════════════════════════════");
  console.log(`✅ Migrated: ${stats.migrated}`);
  console.log(`⏭️  Skipped:  ${stats.skipped}`);
  console.log(`❌ Failed:   ${stats.failed}`);
  console.log("════════════════════════════════════════\n");

  process.exit(stats.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
