/**
 * Clear stale station counters and rebuild officer ObjectId mapping
 * on Station, HQ, and Area from the Officer collection.
 *
 * Run: npm run fix:officer-org-mapping
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Station from "../models/Station";
import { rebuildAllOfficerOrgMappings } from "../services/officerOrgMapping";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB");

  const cleared = await Station.updateMany(
    {},
    { $set: { totalCases: 0, resolvedCases: 0, officerCount: 0 } }
  );
  console.log(`Cleared stale counters on ${cleared.modifiedCount} stations`);

  const result = await rebuildAllOfficerOrgMappings();
  console.log(
    `Rebuilt officer mappings — stations: ${result.stations}, HQs: ${result.hqs}, areas: ${result.areas}`
  );

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
