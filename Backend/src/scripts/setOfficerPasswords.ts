/**
 * Enable portal login and set a shared password on officers (skips Super Admin).
 *
 * Run: npm run set:officer-passwords
 * Optional: npm run set:officer-passwords -- --email=testhq1station1l1@esm.in
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Officer from "../models/Officer";

const DEFAULT_PASSWORD = "Jairam@123";

async function main() {
  const emailArg = process.argv.find((a) => a.startsWith("--email="));
  const onlyEmail = emailArg?.split("=")[1]?.toLowerCase().trim();

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB\n");

  const filter: Record<string, unknown> = { role: { $ne: "Super Admin" } };
  if (onlyEmail) filter.email = onlyEmail;

  const officers = await Officer.find(filter).select("+password");
  if (officers.length === 0) {
    console.log("No officers matched.");
    return;
  }

  let updated = 0;
  for (const officer of officers) {
    const username = officer.username || officer.email.split("@")[0];
    officer.username = username;
    officer.password = DEFAULT_PASSWORD;
    officer.canLogin = true;
    if (officer.status !== "active") officer.status = "active";
    await officer.save();
    updated++;
    console.log(`🔑 ${officer.email} → username: ${username}`);
  }

  console.log(`\n✅ Updated ${updated} officer(s). Password: ${DEFAULT_PASSWORD}`);
  console.log("Super Admin was not changed.\n");
}

main()
  .catch((err) => {
    console.error("❌ set:officer-passwords failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
