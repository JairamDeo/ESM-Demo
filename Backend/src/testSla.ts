import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import connectDB from "./config/database";
import { getSlaConfigForCaseType } from "./services/slaConfigService";
import CaseType from "./models/CaseType";
import SlaConfig from "./models/SlaConfig";

async function run() {
  await connectDB();
  
  const caseType = await CaseType.findOne();
  if (!caseType) {
    console.log("No case type found");
    process.exit(0);
  }
  
  // Create an enabled override
  const global = await SlaConfig.findOne().sort({ updatedAt: -1 });
  if (global) {
    const idx = global.caseTypeOverrides?.findIndex(o => String(o.caseTypeId) === String(caseType._id));
    if (idx !== undefined && idx >= 0 && global.caseTypeOverrides) {
        global.caseTypeOverrides[idx].enabled = true;
        global.caseTypeOverrides[idx].hours = 1;
        global.caseTypeOverrides[idx].minutes = 30;
        await global.save();
    }
  }

  // test raw
  const idStr = String(caseType._id);
  const doc = await SlaConfig.findOne().sort({ updatedAt: -1 }).lean();
  const overrides = (doc as any).caseTypeOverrides as Record<string, unknown>[] | undefined;
  console.log("ID STR:", idStr);
  overrides?.forEach(o => {
    console.log("Checking override caseTypeId:", o.caseTypeId, "typeof:", typeof o.caseTypeId, "constructor:", o.caseTypeId?.constructor?.name, "Stringified:", String(o.caseTypeId));
  });

  const slaConfig = await getSlaConfigForCaseType(caseType._id);
  console.log("SLA Config for CaseType after enable:", slaConfig);
  
  process.exit(0);
}

run();
