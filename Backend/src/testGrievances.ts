import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import connectDB from "./config/database";
import Grievance from "./models/Grievance";

async function run() {
  await connectDB();
  
  const grievances = await Grievance.find().limit(5).lean();
  console.log(grievances.map(g => ({ id: g._id, caseTypeId: g.caseTypeId, caseType: g.type })));
  
  process.exit(0);
}

run();
