import { Request, Response } from "express";
import Officer, { OFFICER_LEVELS } from "../models/Officer";
import Station from "../models/Station";
import { getPermissionsForOfficerRole } from "../services/rbacService";

// ─── Helper: get station filter based on role ────────────────────────────────
const getStationFilter = (req: Request): any => {
  const user = (req as any).user;
  if (!user || user.role === "super_admin") return {};
  if (user.station && user.station !== "Nagpur Sub-Area") {
    return { stationName: { $regex: user.station.replace(" Station HQ", ""), $options: "i" } };
  }
  return {};
};

// ─── GET all officers ────────────────────────────────────────────────────────
export const getOfficers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, station, status, page = 1, limit = 20 } = req.query;

    const stationFilter = getStationFilter(req);
    const query: any = { ...stationFilter };

    if (search) {
      query.$or = [
        { name:        { $regex: search, $options: "i" } },
        { email:       { $regex: search, $options: "i" } },
        { stationName: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (station && (req as any).user?.role === "super_admin") {
      query.stationName = { $regex: station, $options: "i" };
    }
    if (status) query.status = status;

    const pageNum  = parseInt(page  as string);
    const limitNum = parseInt(limit as string);

    const [officers, total] = await Promise.all([
      Officer.find(query)
        .populate("station", "name city stateName")  // ← fixed: stationId → station
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Officer.countDocuments(query),
    ]);

    // Role-wise counts — filtered by station for non super_admin
    const countFilter = { ...stationFilter };
    // const [esmCount, stationCount, recordCount] = await Promise.all([
    //   Officer.countDocuments({ ...countFilter, role: "ESM Officer" }),
    //   Officer.countDocuments({ ...countFilter, role: "Station HQ Officer" }),
    //   Officer.countDocuments({ ...countFilter, role: "Record Office" }),
    // ]);
    const [esmCount, stationCount, recordCount] = await Promise.all([
    Officer.countDocuments({ ...countFilter, role: "Area Officer" }),
    Officer.countDocuments({ ...countFilter, role: "Headquarter Officer" }),
    Officer.countDocuments({ ...countFilter, role: "Station HQ Officer" }),
   ]);

    res.status(200).json({
      success: true,
      data: officers,
      summary: { esmOfficers: esmCount, stationOfficers: stationCount, recordOffice: recordCount },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET single officer ──────────────────────────────────────────────────────
export const getOfficerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const officer = await Officer.findById(req.params.id)
      .populate("station", "name city stateName");  // ← fixed
    if (!officer) { res.status(404).json({ success: false, message: "Officer not found" }); return; }
    res.status(200).json({ success: true, data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE officer ──────────────────────────────────────────────────────────
export const createOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rank, role, stationName, email, phone, permissions, level } = req.body;

    if (!name || !role || !email || !stationName) {
      res.status(400).json({ success: false, message: "name, role, email and stationName are required" });
      return;
    }

    if (!level || !OFFICER_LEVELS.includes(level)) {
      res.status(400).json({ success: false, message: "level must be L1, L2, or L3" });
      return;
    }

    const existing = await Officer.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: "Officer with this email already exists" });
      return;
    }

    const stationDoc = await Station.findOne({
      name: { $regex: stationName, $options: "i" },
      isActive: true,
    });

    const defaultPermissions = await getPermissionsForOfficerRole(role);
    const officerPermissions =
      permissions && typeof permissions === "object"
        ? { ...defaultPermissions, ...permissions }
        : defaultPermissions;

    const officer = await Officer.create({
      name:        name.trim(),
      rank:        rank?.trim() || "",
      role,
      level,
      station:     stationDoc?._id,
      stationName: stationDoc?.name || stationName,
      email:       email.toLowerCase().trim(),
      phone,
      permissions: officerPermissions,
    });

    if (stationDoc) {
      await Station.findByIdAndUpdate(stationDoc._id, { $inc: { officerCount: 1 } });
    }

    res.status(201).json({ success: true, message: "Officer added successfully", data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE officer ──────────────────────────────────────────────────────────
export const updateOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationName, permissions, ...rest } = req.body;
    const updateData: any = { ...rest };

    if (permissions && typeof permissions === "object") {
      updateData.permissions = permissions;
    }

    if (updateData.level !== undefined) {
      if (updateData.level && !OFFICER_LEVELS.includes(updateData.level)) {
        res.status(400).json({ success: false, message: "level must be L1, L2, or L3" });
        return;
      }
    }

    if (stationName) {
      const stationDoc = await Station.findOne({
        name: { $regex: stationName, $options: "i" },
        isActive: true,
      });
      updateData.stationName = stationDoc?.name || stationName;
      updateData.station     = stationDoc?._id;  // ← fixed: stationId → station
    }

    const officer = await Officer.findByIdAndUpdate(
      req.params.id, updateData, { new: true, runValidators: true }
    ).populate("station", "name city stateName");

    if (!officer) { res.status(404).json({ success: false, message: "Officer not found" }); return; }
    res.status(200).json({ success: true, message: "Officer updated", data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TOGGLE officer status ───────────────────────────────────────────────────
export const toggleOfficerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) { res.status(404).json({ success: false, message: "Officer not found" }); return; }

    officer.status = officer.status === "active" ? "inactive" : "active";
    await officer.save();

    res.status(200).json({ success: true, message: `Officer ${officer.status}`, data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE officer ──────────────────────────────────────────────────────────
export const deleteOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const officer = await Officer.findByIdAndDelete(req.params.id);
    if (!officer) { res.status(404).json({ success: false, message: "Officer not found" }); return; }

    // ← fixed: stationId → station
    if (officer.station) {
      await Station.findByIdAndUpdate(officer.station, { $inc: { officerCount: -1 } });
    }

    res.status(200).json({ success: true, message: "Officer deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};