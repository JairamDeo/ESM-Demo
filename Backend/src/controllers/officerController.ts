import { Request, Response } from "express";
import Officer from "../models/Officer";
import Station from "../models/Station";

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
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { stationName: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (station && (req as any).user?.role === "super_admin") {
      query.stationName = { $regex: station, $options: "i" };
    }
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [officers, total] = await Promise.all([
      Officer.find(query)
        .populate("stationId", "name city state")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Officer.countDocuments(query),
    ]);

    // Role-wise counts — also filtered by station for non super_admin
    const countFilter = { ...stationFilter };
    const [esmCount, stationCount, recordCount] = await Promise.all([
      Officer.countDocuments({ ...countFilter, role: "ESM Officer" }),
      Officer.countDocuments({ ...countFilter, role: "Station HQ Officer" }),
      Officer.countDocuments({ ...countFilter, role: "Record Office" }),
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
    const officer = await Officer.findById(req.params.id).populate("stationId");
    if (!officer) { res.status(404).json({ success: false, message: "Officer not found" }); return; }
    res.status(200).json({ success: true, data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE officer ──────────────────────────────────────────────────────────
export const createOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, rank, role, stationName, email, phone } = req.body;

    if (!name || !role || !email || !stationName) {
      res.status(400).json({ success: false, message: "name, role, email and stationName are required" });
      return;
    }

    const existing = await Officer.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: "Officer with this email already exists" });
      return;
    }

    const station = await Station.findOne({ name: { $regex: stationName, $options: "i" } });

    const officer = await Officer.create({
      name: name.trim(), rank: rank?.trim() || "", role,
      stationId: station?._id,
      stationName: station?.name || stationName,
      email: email.toLowerCase().trim(), phone,
    });

    if (station) {
      await Station.findByIdAndUpdate(station._id, { $inc: { officerCount: 1 } });
    }

    res.status(201).json({ success: true, message: "Officer added successfully", data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE officer ──────────────────────────────────────────────────────────
export const updateOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationName, ...rest } = req.body;
    const updateData: any = { ...rest };

    if (stationName) {
      const station = await Station.findOne({ name: { $regex: stationName, $options: "i" } });
      updateData.stationName = station?.name || stationName;
      updateData.stationId = station?._id;
    }

    const officer = await Officer.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
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

    if (officer.stationId) {
      await Station.findByIdAndUpdate(officer.stationId, { $inc: { officerCount: -1 } });
    }

    res.status(200).json({ success: true, message: "Officer deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};