import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

import User from "../models/User";
import Station from "../models/Station";
import Officer from "../models/Officer";
import Grievance from "../models/Grievance";
import Escalation from "../models/Escalation";
import CaseType from "../models/CaseType";
import CaseTypeRequiredDocuments from "../models/CaseTypeRequiredDocuments";
import { IDENTITY_PERSONAL_REQUIRED_DOCUMENTS_RESOLVED } from "../constants/identityPersonalRequiredDocuments";
import Category from "../models/Category";
import QRCode from "../models/QRCode";
import Notification from "../models/Notification";
import qrcode from "qrcode";
import HQ from "../models/HeadQuarter";
import State from "../models/State";
import RolePermission from "../models/RolePermission";
import { DEFAULT_ROLE_PERMISSIONS } from "../constants/permissions";
import { rbacRoleFromJobRole } from "../constants/officerRoles";


const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("✅ Connected to MongoDB");

  // ── Wipe existing data ────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}), HQ.deleteMany({}), State.deleteMany({}), Station.deleteMany({}),
    Officer.deleteMany({}), Grievance.deleteMany({}), Escalation.deleteMany({}),
    Category.deleteMany({}), CaseType.deleteMany({}), CaseTypeRequiredDocuments.deleteMany({}),
    QRCode.deleteMany({}), Notification.deleteMany({}),
    RolePermission.deleteMany({}),
  ]);
  console.log("🗑️  Cleared existing data");

  // ── Role permissions (RBAC matrix) ────────────────────────────────────────
  await RolePermission.insertMany(
    (Object.keys(DEFAULT_ROLE_PERMISSIONS) as Array<keyof typeof DEFAULT_ROLE_PERMISSIONS>).map((role) => ({
      role,
      permissions: DEFAULT_ROLE_PERMISSIONS[role],
    }))
  );
  console.log(`🔐 Seeded ${Object.keys(DEFAULT_ROLE_PERMISSIONS).length} role permission profiles`);

  // ── Categories (referenced by case types) ─────────────────────────────────
  const categories = await Category.insertMany([
    { name: "Identity & Personal" },
    { name: "Pension & Financial" },
    { name: "Family Details" },
    { name: "Requests & Tracking" },
  ]);
  console.log(`🏷️  Created ${categories.length} categories`);
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c._id]));

  // ── Case Types ────────────────────────────────────────────────────────────
  const caseTypesData = [
    { id: "casetype1",  name: "Update DOB",                                                   description: "Change or correct your date of birth in official records.",                           totalCases: 87,  pendingCases: 12, resolvedCases: 75,  category: categoryByName["Identity & Personal"] },
    { id: "casetype2",  name: "Update Name in PPO",                                           description: "Request correction or update of name in PPO.",                                        totalCases: 92,  pendingCases: 15, resolvedCases: 77,  category: categoryByName["Identity & Personal"] },
    { id: "casetype3",  name: "Update Surname",                                               description: "Request correction or update of surname in official records.",                        totalCases: 68,  pendingCases: 5,  resolvedCases: 63,  category: categoryByName["Identity & Personal"] },
    { id: "casetype4",  name: "Update First and Middle Name",                                 description: "Request correction or update of first and middle name.",                              totalCases: 54,  pendingCases: 7,  resolvedCases: 47,  category: categoryByName["Identity & Personal"] },
    { id: "casetype5",  name: "Update Aadhaar Card",                                          description: "Update or link Aadhaar details with service records.",                                totalCases: 54,  pendingCases: 7,  resolvedCases: 47,  category: categoryByName["Identity & Personal"] },
    { id: "casetype6",  name: "Pension Start for Unmarried/Divorced and Unemployed Daughter", description: "Request pension benefits for eligible unmarried, divorced, or unemployed daughters.", totalCases: 54,  pendingCases: 7,  resolvedCases: 47,  category: categoryByName["Identity & Personal"] },
    { id: "casetype7",  name: "Resolve Pension Issues",                                       description: "Pension queries & corrections",                                                       totalCases: 156, pendingCases: 42, resolvedCases: 114, category: categoryByName["Pension & Financial"] },
    { id: "casetype8",  name: "Stop FMA",                                                     description: "Fixed Medical Allowance",                                                             totalCases: 31,  pendingCases: 4,  resolvedCases: 27,  category: categoryByName["Pension & Financial"] },
    { id: "casetype9",  name: "Monthly Pay Slip",                                             description: "Download & view slips",                                                               totalCases: 78,  pendingCases: 3,  resolvedCases: 75,  category: categoryByName["Pension & Financial"] },
    { id: "casetype10", name: "Pension Payment Order",                                        description: "PPO access & updates",                                                                totalCases: 62,  pendingCases: 11, resolvedCases: 51,  category: categoryByName["Pension & Financial"] },
    { id: "casetype11", name: "Add Nominee",                                                  description: "Nominee registration",                                                                totalCases: 43,  pendingCases: 6,  resolvedCases: 37,  category: categoryByName["Family Details"] },
    { id: "casetype12", name: "Update DOB of Spouse",                                         description: "Date of birth correction",                                                            totalCases: 29,  pendingCases: 4,  resolvedCases: 25,  category: categoryByName["Family Details"] },
    { id: "casetype13", name: "Update Spouse Details",                                        description: "Name, PAN, Aadhaar, Email",                                                           totalCases: 38,  pendingCases: 5,  resolvedCases: 33,  category: categoryByName["Family Details"] },
    { id: "casetype14", name: "Add/Update Family Details",                                    description: "Family composition records",                                                          totalCases: 47,  pendingCases: 9,  resolvedCases: 38,  category: categoryByName["Family Details"] },
    { id: "casetype15", name: "Death Intimation",                                             description: "ESM & Dependents",                                                                    totalCases: 45,  pendingCases: 8,  resolvedCases: 37,  category: categoryByName["Requests & Tracking"] },
    { id: "casetype16", name: "Grievance for Increment",                                      description: "As per Rank & Service",                                                               totalCases: 34,  pendingCases: 8,  resolvedCases: 26,  category: categoryByName["Requests & Tracking"] },
    { id: "casetype17", name: "Track Case Status",                                            description: "Real-time tracking portal",                                                           totalCases: 210, pendingCases: 0,  resolvedCases: 210, category: categoryByName["Requests & Tracking"] },
    { id: "casetype18", name: "SMS / Portal Alerts",                                          description: "Notifications on updates",                                                            totalCases: 173, pendingCases: 0,  resolvedCases: 173, category: categoryByName["Requests & Tracking"] },
  ];
  const caseTypes = await CaseType.create(caseTypesData);
  console.log(`📋 Created ${caseTypes.length} case types`);

  const caseTypeBySlug = Object.fromEntries(caseTypes.map((ct) => [ct.id, ct]));
  const requiredDocRows = IDENTITY_PERSONAL_REQUIRED_DOCUMENTS_RESOLVED.map((entry) => {
    const ct = caseTypeBySlug[entry.caseTypeSlug];
    if (!ct) return null;
    return {
      caseType: ct._id,
      caseTypeSlug: ct.id,
      caseTypeName: ct.name,
      categoryId: ct.category,
      categoryName: "Identity & Personal",
      documents: entry.documents.map((d) => ({
        label: d.label,
        text: d.text,
        isMandatory: d.isMandatory !== false,
        sortOrder: d.sortOrder,
      })),
      questions: [], // admin-managed only
      guidelines: entry.guidelines ?? [],
      note: entry.note ?? "",
      acceptedFormats: "PDF, JPG, JPEG, PNG",
      maxFileSizeMb: 5,
      isActive: true,
      createdBy: { id: "seed", name: "System Seed", role: "Super Admin" },
    };
  }).filter(Boolean);
  if (requiredDocRows.length) {
    await CaseTypeRequiredDocuments.insertMany(requiredDocRows);
    console.log(`📄 Seeded required documents for ${requiredDocRows.length} Identity & Personal case types`);
  }

  // ── States (Areas) ────────────────────────────────────────────────────────
  const statesData = [
    { name: "Maharashtra", code: "MH" },
    { name: "Gujarat",     code: "GJ" },
  ];
  const states = await State.create(statesData);
  console.log(`🗺️  Created ${states.length} states`);

  const mh = states.find((s) => s.code === "MH")!;
  const gj = states.find((s) => s.code === "GJ")!;

  // ── Headquarters (multiple per area) ───────────────────────────────────────
  const hqs = await HQ.create([
    {
      name: "Kamptee Sub-Area HQ",
      city: "Kamptee",
      state: "Maharashtra",
      stateId: mh._id,
      stateName: mh.name,
      stateCode: mh.code,
      address: "Kamptee Cantonment, Nagpur, Maharashtra",
      commanderName: "Brig. R.K. Verma",
    },
    {
      name: "Rajkot Area HQ",
      city: "Rajkot",
      state: "Gujarat",
      stateId: gj._id,
      stateName: gj.name,
      stateCode: gj.code,
      address: "Rajkot Cantonment, Gujarat",
      commanderName: "Brig. S.K. Mehta",
    },
  ]);
  console.log(`🏛️  Created ${hqs.length} HQs`);
  const mhHQ = hqs[0]; // Kamptee Sub-Area HQ → Maharashtra
  const gjHQ = hqs[1]; // Rajkot Area HQ → Gujarat

  // ── Stations (each station under HQ in its own area) ─────────────────────
  const mhStations = [
    { name: "Nagpur Station HQ",     city: "Nagpur",     officerCount: 6,  totalCases: 187, resolvedCases: 145, qrActive: true,  qrCode: "NAG-QR-001" },
    { name: "Pune Station HQ",       city: "Pune",       officerCount: 5,  totalCases: 156, resolvedCases: 128, qrActive: true,  qrCode: "PUN-QR-001" },
    { name: "Nashik Station HQ",     city: "Nashik",     officerCount: 4,  totalCases: 112, resolvedCases: 89,  qrActive: true,  qrCode: "NAS-QR-001" },
    { name: "Aurangabad Station HQ", city: "Aurangabad", officerCount: 5,  totalCases: 98,  resolvedCases: 76,  qrActive: true,  qrCode: "AUR-QR-001" },
    { name: "Kolhapur Station HQ",   city: "Kolhapur",   officerCount: 4,  totalCases: 87,  resolvedCases: 72,  qrActive: true,  qrCode: "KOL-QR-001" },
    { name: "Solapur Station HQ",    city: "Solapur",    officerCount: 4,  totalCases: 82,  resolvedCases: 65,  qrActive: true,  qrCode: "SOL-QR-001" },
  ].map((s) => ({
    ...s,
    hqId: mhHQ._id,
    hqName: mhHQ.name,
    state: mh._id,
    stateName: mh.name,
    stateCode: mh.code,
  }));

  const gjStations = [
    { name: "Ahmedabad Station HQ", city: "Ahmedabad", officerCount: 5, totalCases: 143, resolvedCases: 112, qrActive: true,  qrCode: "AHM-QR-001" },
    { name: "Baroda Station HQ",    city: "Baroda",    officerCount: 5, totalCases: 95,  resolvedCases: 78,  qrActive: true,  qrCode: "BAR-QR-001" },
    { name: "Rajkot Station HQ",    city: "Rajkot",    officerCount: 4, totalCases: 74,  resolvedCases: 58,  qrActive: false, qrCode: "RAJ-QR-001" },
    { name: "Surat Station HQ",     city: "Surat",     officerCount: 4, totalCases: 113, resolvedCases: 91,  qrActive: true,  qrCode: "SUR-QR-001" },
  ].map((s) => ({
    ...s,
    hqId: gjHQ._id,
    hqName: gjHQ.name,
    state: gj._id,
    stateName: gj.name,
    stateCode: gj.code,
  }));

  const stationsData = [...mhStations, ...gjStations];
  const stations = await Station.create(stationsData);
  console.log(`🏢 Created ${stations.length} stations (${mhStations.length} MH → ${mhHQ.name}, ${gjStations.length} GJ → ${gjHQ.name})`);

  const { rebuildHQStationsList } = await import("../services/hqStationSync");
  await rebuildHQStationsList(mhHQ._id);
  await rebuildHQStationsList(gjHQ._id);
  console.log(`🔗 Linked stations to HQ "${mhHQ.name}" and "${gjHQ.name}"`);

  // ── Portal login officers (former admins) ─────────────────────────────────
  const portalOfficers = await Officer.create([
    {
      username: "admin", password: "admin123", canLogin: true,
      name: "Admin Officer", email: "admin@vitric.in",
      role: "Super Admin", rbacRole: "super_admin", rank: "Col.", status: "active",
    },
    {
      username: "area", password: "area123", canLogin: true, level: "L1",
      name: "Lt. Col. V. Rao", email: "area.portal@vitric.in",
      role: "Area Officer", rbacRole: "area", rank: "Lt. Col.", status: "active",
      stateId: mh._id, stateName: mh.name, stateCode: mh.code,
    },
    {
      username: "headquarter", password: "headquarter123", canLogin: true, level: "L1",
      name: "Maj. P. Kulkarni", email: "hq.portal@vitric.in",
      role: "Headquarter Officer", rbacRole: "headquarter", rank: "Maj.", status: "active",
      hqId: mhHQ._id, hqName: mhHQ.name,
      stateId: mh._id, stateName: mh.name, stateCode: mh.code,
    },
    {
      username: "headquarter-gj", password: "headquarter123", canLogin: true, level: "L1",
      name: "Capt. N. Verma", email: "hq.gj.portal@vitric.in",
      role: "Headquarter Officer", rbacRole: "headquarter", rank: "Capt.", status: "active",
      hqId: gjHQ._id, hqName: gjHQ.name,
      stateId: gj._id, stateName: gj.name, stateCode: gj.code,
    },
    {
      username: "stationhq", password: "stationhq123", canLogin: true, level: "L1",
      name: "Maj. T. Nair", email: "station.portal@vitric.in",
      role: "Station HQ Officer", rbacRole: "station_hq", rank: "Maj.", status: "active",
      station: stations[4]._id, stationName: stations[4].name,
      hqId: stations[4].hqId, hqName: stations[4].hqName,
      stateId: stations[4].state, stateName: stations[4].stateName, stateCode: stations[4].stateCode,
    },
  ]);
  console.log(`🔐 Created ${portalOfficers.length} portal login officers`);

  // ── Field officers (no portal login) ──────────────────────────────────────
  const officersData = [
    { name: "Lt. Col. V. Rao",  rank: "Lt. Col.", role: "Area Officer",        level: "L2", stateId: mh._id, stateName: mh.name, stateCode: mh.code, email: "v.rao@army.in",      activeCases: 42, status: "active" },
    { name: "Maj. P. Kulkarni", rank: "Maj.",     role: "Headquarter Officer", level: "L2", hqId: mhHQ._id, hqName: mhHQ.name, stateId: mh._id, stateName: mh.name, stateCode: mh.code, email: "p.kulkarni@army.in", activeCases: 35, status: "active" },
    { name: "Capt. A. Desai",   rank: "Capt.",    role: "Headquarter Officer", level: "L2", hqId: mhHQ._id, hqName: mhHQ.name, stateId: mh._id, stateName: mh.name, stateCode: mh.code, email: "a.desai@army.in",    activeCases: 28, status: "active" },
    { name: "Maj. S. Joshi",    rank: "Maj.",     role: "Headquarter Officer", level: "L2", hqId: gjHQ._id, hqName: gjHQ.name, stateId: gj._id, stateName: gj.name, stateCode: gj.code, email: "s.joshi@army.in",    activeCases: 31, status: "active" },
    { name: "Capt. R. Mehta",   rank: "Capt.",    role: "Headquarter Officer", level: "L2", hqId: gjHQ._id, hqName: gjHQ.name, stateId: gj._id, stateName: gj.name, stateCode: gj.code, email: "r.mehta@army.in",    activeCases: 22, status: "active" },
    { name: "Maj. T. Nair",     rank: "Maj.",     role: "Station HQ Officer",  level: "L2", station: stations[4]._id, stationName: stations[4].name, hqId: stations[4].hqId, hqName: stations[4].hqName, stateId: stations[4].state, stateName: stations[4].stateName, stateCode: stations[4].stateCode, email: "t.nair@army.in", activeCases: 18, status: "inactive" },
    { name: "Lt. D. Pawar",     rank: "Lt.",      role: "Headquarter Officer", level: "L2", hqId: mhHQ._id, hqName: mhHQ.name, stateId: mh._id, stateName: mh.name, stateCode: mh.code, email: "d.pawar@army.in",    activeCases: 24, status: "active" },
    { name: "Maj. H. Patel",    rank: "Maj.",     role: "Headquarter Officer", level: "L2", hqId: mhHQ._id, hqName: mhHQ.name, stateId: mh._id, stateName: mh.name, stateCode: mh.code, email: "h.patel@army.in",    activeCases: 27, status: "active" },
    { name: "Col. K. Sharma",   rank: "Col.",     role: "Area Officer",        level: "L2", stateId: gj._id, stateName: gj.name, stateCode: gj.code, email: "k.sharma@army.in", activeCases: 15, status: "active" },
    { name: "Maj. G. Shah",     rank: "Maj.",     role: "Headquarter Officer", level: "L2", hqId: gjHQ._id, hqName: gjHQ.name, stateId: gj._id, stateName: gj.name, stateCode: gj.code, email: "g.shah@army.in",     activeCases: 20, status: "active" },
  ];
  const fieldOfficers = await (Officer as any).create(
    officersData.map((o) => ({
      ...o,
      rbacRole: rbacRoleFromJobRole(o.role),
      canLogin: false,
    }))
  );
  const officers = [...portalOfficers, ...fieldOfficers];
  console.log(`👮 Created ${officers.length} officers (${portalOfficers.length} with login)`);

  // ── QR Codes with real SVGs ───────────────────────────────────────────────
  const qrCodesData = [
    { code: "NAGPUR-QR-001", station: stations[0], scans: 234, lastScanned: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { code: "PUNE-QR-001", station: stations[1], scans: 198, lastScanned: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { code: "NASHIK-QR-001", station: stations[2], scans: 132, lastScanned: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    { code: "AURANGABAD-QR-001", station: stations[3], scans: 98,  lastScanned: new Date(Date.now() - 12 * 60 * 60 * 1000) },
    { code: "KOLHAPUR-QR-001", station: stations[4], scans: 87,  lastScanned: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { code: "SOLAPUR-QR-001", station: stations[5], scans: 76,  lastScanned: new Date(Date.now() - 8 * 60 * 60 * 1000) },
    { code: "AHMEDABAD-QR-001", station: stations[6], scans: 167, lastScanned: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { code: "BARODA-QR-001", station: stations[7], scans: 112, lastScanned: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { code: "RAJKOT-QR-001", station: stations[8], scans: 45,  lastScanned: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: "inactive" },
    { code: "SURAT-QR-001", station: stations[9], scans: 134, lastScanned: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  ];

  const qrDocs = [];
  for (const q of qrCodesData) {
    const qrData = `https://vitric-esm.in/grievance?station=${encodeURIComponent(q.station.name)}&code=${q.code}`;
    // const qrData = `http://localhost:5173/grievance?station=${encodeURIComponent(q.station.name)}&code=${q.code}`;
    const svgContent = await qrcode.toString(qrData, { type: "svg", errorCorrectionLevel: "H", margin: 2 });
    qrDocs.push({
      stationId: q.station._id,
      stationName: q.station.name,
      code: q.code,
      qrData,
      svgContent,
      totalScans: q.scans,
      lastScannedAt: q.lastScanned,
      status: (q as any).status || "active",
      generatedBy: portalOfficers[0]._id,
    });
  }
  const qrCodes = await QRCode.create(qrDocs);
  console.log(`📲 Created ${qrCodes.length} QR codes`);

  // ── Sample Users (veterans) ───────────────────────────────────────────────
  const users = await User.create([
    { phone: "9876543210", name: "Col. R.K. Sharma (Retd.)", rank: "Colonel", serviceNumber: "IC-45678", stationHQ: "Pune Station HQ", isVerified: true },
    { phone: "9456712345", name: "Hav. S. Patil",            rank: "Havildar", serviceNumber: "JC-789012", stationHQ: "Nashik Station HQ", isVerified: true },
    { phone: "9012345678", name: "Mrs. Meena Devi",          stationHQ: "Nagpur Station HQ", isVerified: true },
  ]);
  console.log(`👥 Created ${users.length} users`);

  // ── Grievances ────────────────────────────────────────────────────────────
  const now = new Date();
  const grievancesData = [
    {
      grievanceId: "GRV-1247",
      type: "Resolve Pension Issues",
      veteranName: "Col. R.K. Sharma (Retd.)",
      veteranPhone: "+91 98765 43210",
      veteranArmyNo: "IC-45678",
      veteranRank: "Colonel",
      userId: users[0]._id,
      stationId: stations[1]._id,
      stationName: "Pune Station HQ",
      officerName: "Maj. P. Kulkarni",
      status: "pending",
      priority: "high",
      description: "Pension arrears pending since Jan 2026. SPARSH records show discrepancy in rank-based entitlement.",
      submissionSource: "portal",
      slaDeadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      timeline: [{ status: "pending", note: "Grievance submitted via portal", updatedBy: "Col. R.K. Sharma", updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) }],
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
    {
      grievanceId: "GRV-1246",
      type: "Update Aadhaar & PAN",
      veteranName: "Hav. S. Patil",
      veteranPhone: "+91 94567 12345",
      veteranArmyNo: "JC-789012",
      veteranRank: "Havildar",
      userId: users[1]._id,
      stationId: stations[2]._id,
      stationName: "Nashik Station HQ",
      officerName: "Capt. A. Desai",
      status: "in-progress",
      priority: "medium",
      description: "Aadhaar linked to old mobile number. PAN mismatch in pension records.",
      submissionSource: "qr_code",
      slaDeadline: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
      timeline: [
        { status: "pending",     note: "Submitted via QR Code",        updatedBy: "Hav. S. Patil",  updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
        { status: "in-progress", note: "Assigned to Capt. A. Desai",   updatedBy: "Admin",          updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
      ],
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      grievanceId: "GRV-1245",
      type: "Death Intimation",
      veteranName: "Mrs. Meena Devi",
      veteranPhone: "+91 90123 45678",
      veteranArmyNo: "15673421",
      veteranRank: "Sepoy",
      userId: users[2]._id,
      stationId: stations[0]._id,
      stationName: "Nagpur Station HQ",
      officerName: "Lt. Col. V. Rao",
      status: "escalated",
      priority: "critical",
      description: "Death of veteran Sep. Ram Devi. Family pension transfer to widow pending. Urgent action required.",
      submissionSource: "walk_in",
      slaDeadline: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      timeline: [
        { status: "pending",   note: "Walk-in submission",        updatedBy: "Mrs. Meena Devi", updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000) },
        { status: "escalated", note: "Overdue — critical case",   updatedBy: "System",          updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) },
      ],
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    },
    {
      grievanceId: "GRV-1244",
      type: "Add Nominee",
      veteranName: "Nk. V. Deshmukh",
      veteranArmyNo: "14567890",
      veteranRank: "Naik",
      stationId: stations[6]._id,
      stationName: "Ahmedabad Station HQ",
      officerName: "Maj. S. Joshi",
      status: "resolved",
      priority: "low",
      description: "Nominee addition for son. Documents submitted and verified.",
      submissionSource: "portal",
      resolvedAt: new Date(now.getTime() - 30 * 60 * 1000),
      slaDeadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      timeline: [
        { status: "pending",     note: "Submitted",           updatedBy: "Nk. V. Deshmukh", updatedAt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
        { status: "in-progress", note: "Documents verified",  updatedBy: "Maj. S. Joshi",   updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
        { status: "resolved",    note: "Case closed",         updatedBy: "Maj. S. Joshi",   updatedAt: new Date(now.getTime() - 30 * 60 * 1000) },
      ],
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
    },
    {
      grievanceId: "GRV-1243",
      type: "Stop FMA",
      veteranName: "Sub. A.K. Singh",
      veteranArmyNo: "JC-112233",
      veteranRank: "Subedar",
      stationId: stations[3]._id,
      stationName: "Aurangabad Station HQ",
      officerName: "Capt. R. Mehta",
      status: "pending",
      priority: "medium",
      description: "Request to stop Fixed Medical Allowance as veteran enrolled in ECHS.",
      submissionSource: "portal",
      slaDeadline: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
      timeline: [{ status: "pending", note: "Submitted via portal", updatedBy: "Sub. A.K. Singh", updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000) }],
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
  ];

  const grievances = await (Grievance as any).create(grievancesData as any);
  console.log(`📄 Created ${grievances.length} grievances`);

  // ── Escalations ───────────────────────────────────────────────────────────
  const escalations = await Escalation.create([
    {
      escalationId: "ESC-049",
      grievanceId: grievances[2]._id,
      grievanceCode: "GRV-1245",
      veteranName: "Mrs. Meena Devi",
      type: "Death Intimation",
      stationName: "Nagpur Station HQ",
      reason: "Overdue > 15 days",
      escalatedTo: "ESM Officer",
      escalatedBy: "System (Auto)",
      daysOpen: 18,
      status: "open",
    },
    {
      escalationId: "ESC-048",
      grievanceId: grievances[0]._id,
      grievanceCode: "GRV-1238",
      veteranName: "Hav. G. More",
      type: "Pension Issue",
      stationName: "Pune Station HQ",
      reason: "No response from Record Office",
      escalatedTo: "Sub-Area Commander",
      escalatedBy: "System (Auto)",
      daysOpen: 22,
      status: "open",
    },
    {
      escalationId: "ESC-047",
      grievanceId: grievances[1]._id,
      grievanceCode: "GRV-1230",
      veteranName: "Sub. P. Nair",
      type: "Increment Grievance",
      stationName: "Ahmedabad Station HQ",
      reason: "Auto-escalation (SLA breach)",
      escalatedTo: "ESM Officer",
      escalatedBy: "System (Auto)",
      daysOpen: 12,
      status: "resolved",
      resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      resolvedBy: "Lt. Col. V. Rao",
      resolutionNote: "Coordinated with Record Office directly",
    },
  ]);
  console.log(`⚠️  Created ${escalations.length} escalations`);

  // ── Sample Notifications ──────────────────────────────────────────────────
  await Notification.create([
    {
      recipientId: users[0]._id,
      recipientType: "user",
      title: "Grievance Received",
      message: "Your grievance GRV-1247 has been received and is pending review.",
      type: "grievance_update",
      grievanceId: grievances[0]._id,
      grievanceCode: "GRV-1247",
      isRead: false,
    },
    {
      recipientId: users[1]._id,
      recipientType: "user",
      title: "Case In Progress",
      message: "Your grievance GRV-1246 is now being reviewed by Capt. A. Desai.",
      type: "grievance_update",
      grievanceId: grievances[1]._id,
      grievanceCode: "GRV-1246",
      isRead: false,
    },
    {
      recipientId: portalOfficers[0]._id,
      recipientType: "admin",
      title: "Critical Escalation",
      message: "ESC-049: Death Intimation case for Mrs. Meena Devi requires urgent attention.",
      type: "escalation",
      isRead: false,
    },
  ]);
  console.log("🔔 Created notifications");

  console.log("\n✅ Database seeded successfully!");
  console.log("─────────────────────────────────────────");
  console.log("🔑 Portal login (officers collection):");
  console.log("   Super Admin  → admin / admin123");
  console.log("   Area  → area / area123");
  console.log("   Headquarter   → headquarter / headquarter123  (Kamptee / MH)");
  console.log("   Headquarter GJ → headquarter-gj / headquarter123  (Rajkot / GJ)");
  console.log("   Station HQ → stationhq / stationhq123  (Kolhapur)");
  console.log("─────────────────────────────────────────");
  console.log("📱 Test User Phone: 9876543210 (OTP: 1234)");
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
