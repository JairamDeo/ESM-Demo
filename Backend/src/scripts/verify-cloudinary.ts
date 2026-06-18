/**
 * Verify Cloudinary credentials (separate .env vars) + upload permission.
 * Run: npm run verify:cloudinary
 */
import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryCredentials } from "../services/cloudinaryService";

function mask(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 4) return "*".repeat(value.length);
  return `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} chars)`;
}

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function main() {
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } =
    getCloudinaryCredentials();

  console.log("Cloudinary env check\n");
  console.log(`  CLOUDINARY_CLOUD_NAME  = ${cloudName || "(missing)"}`);
  console.log(`  CLOUDINARY_API_KEY     = ${mask(apiKey)}`);
  console.log(`  CLOUDINARY_API_SECRET  = ${mask(apiSecret)}`);
  console.log(`  USE_CLOUDINARY         = ${process.env.USE_CLOUDINARY ?? "(not set)"}`);

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("\n❌ Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Backend/.env");
    process.exit(1);
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });

  try {
    const ping = await cloudinary.api.ping();
    console.log(`\n✅ Ping OK: ${JSON.stringify(ping)}`);
  } catch (err: any) {
    console.error(`\n❌ Ping failed: ${err?.message || err}`);
    console.log("\nCheck API key + secret match the same key row in Cloudinary → Settings → API Keys.");
    process.exit(1);
  }

  // Ping can pass even when upload is forbidden — test a real upload
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${process.env.CLOUDINARY_FOLDER || "esm"}/verify-test`,
          public_id: `verify-${Date.now()}`,
          resource_type: "image",
          overwrite: true,
        },
        (error, uploadResult) => {
          if (error) reject(error);
          else resolve(uploadResult);
        }
      );
      stream.end(TINY_PNG);
    });

    console.log(`✅ Upload OK: ${result.secure_url}`);
    try {
      await cloudinary.uploader.destroy(result.public_id, { invalidate: true });
    } catch {
      /* ignore cleanup errors */
    }
    console.log("\nCloudinary is ready for migrate:local-uploads and all file uploads.\n");
  } catch (err: any) {
    const msg = err?.message || String(err);
    const httpCode = (err as any)?.http_code;
    console.error(`\n❌ Upload test failed (${httpCode || "error"}): ${msg}`);

    if (httpCode === 403) {
      console.log(`
This usually means your API key has NO upload permission.

Cloudinary → Settings → API Keys → select your key → Assign roles:

  • Easiest: assign "Master Admin" (or a role with Upload permission)
  • New API keys are created with zero permissions by default

Then run:  npm run verify:cloudinary
`);
    }
    process.exit(1);
  }
}

main();
