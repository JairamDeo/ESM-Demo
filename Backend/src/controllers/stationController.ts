import { Request, Response } from "express";
import Station from "../models/Station";
import HQ from "../models/HeadQuarter";
import State from "../models/State";
import QRCode from "../models/QRCode";
import qrcode from "qrcode";
import {
  syncStationOnHQ,
  removeStationFromHQ,
} from "../services/hqStationSync";

async function resolveStateByName(stateName: string) {
  return State.findOne({
    name: { $regex: `^${stateName.trim()}$`, $options: "i" },
    isActive: true,
  });
}

async function resolveHQ(hqId: string) {
  return HQ.findOne({ _id: hqId, isActive: true });
}

import { getStationListFilter } from "../utils/scopeFilter";
import { buildAuditEntry } from "../services/auditService";

// ─── GET all stations ────────────────────────────────────────────────────────
export const getStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, state, qrActive, page = 1, limit = 20 } = req.query;

    const stationFilter = getStationListFilter((req as any).user);
    const query: any = { isActive: true, ...stationFilter };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { stateName: { $regex: search, $options: "i" } },
        { hqName: { $regex: search, $options: "i" } },
      ];
    }
    if (state && (req as any).user?.role === "super_admin") {
      query.stateName = { $regex: state, $options: "i" };
    }
    const { hqId } = req.query;
    if (hqId) query.hqId = hqId;
    if (qrActive !== undefined) query.qrActive = qrActive === "true";

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [stations, total] = await Promise.all([
      Station.find(query)
        .populate("hqId", "name city state")
        .populate("state", "name code")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Station.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: stations,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET single station ──────────────────────────────────────────────────────
export const getStationById = async (req: Request, res: Response): Promise<void> => {
  try {
    const station = await Station.findById(req.params.id)
      .populate("hqId", "name city state address commanderName")
      .populate("state", "name code");
    if (!station || !station.isActive) {
      res.status(404).json({ success: false, message: "Station not found" });
      return;
    }
    res.status(200).json({ success: true, data: station });
  } catch (error:any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE station ──────────────────────────────────────────────────────────
export const createStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, city, state, address, officerCount, contactEmail, contactPhone, hqId, hqName } = req.body;

    if (!name || !city || !state || !hqId) {
      res.status(400).json({
        success: false,
        message: "name, city, state and headquarters (hqId) are required",
      });
      return;
    }

    const actor = (req as any).user;
    const hqDoc = await resolveHQ(hqId);
    if (!hqDoc) {
      res.status(400).json({ success: false, message: "Invalid headquarters selected" });
      return;
    }

    if (actor.role === "headquarter" && actor.hqId && hqDoc._id.toString() !== actor.hqId) {
      res.status(403).json({ success: false, message: "You can only create stations under your headquarters" });
      return;
    }

    const stateDoc = await resolveStateByName(String(state));
    if (!stateDoc) {
      res.status(400).json({ success: false, message: "Invalid state selected" });
      return;
    }

    if (actor.role === "area" && actor.stateId && stateDoc._id.toString() !== actor.stateId) {
      res.status(403).json({ success: false, message: "Station must belong to your area" });
      return;
    }
    if (hqDoc.stateId && actor.role === "area" && actor.stateId && hqDoc.stateId.toString() !== actor.stateId) {
      res.status(403).json({ success: false, message: "Headquarters must belong to your area" });
      return;
    }

    const stationPayload = {
      name: name.trim(),
      city: city.trim(),
      hqId: hqDoc._id,
      hqName: (hqName || hqDoc.name).trim(),
      state: stateDoc._id,
      stateCode: stateDoc.code,
      stateName: stateDoc.name,
      address,
      officerCount: officerCount || 0,
      contactEmail,
      contactPhone,
    };

    const existing = await Station.findOne({
      name: { $regex: `^${stationPayload.name}$`, $options: "i" },
      isActive: true,
    });
    if (existing) {
      res.status(409).json({ success: false, message: "Station with this name already exists" });
      return;
    }

    const inactive = await Station.findOne({
      name: { $regex: `^${stationPayload.name}$`, $options: "i" },
      isActive: false,
    });
    const auditEntry = buildAuditEntry(actor, inactive ? "update" : "create", {
      note: inactive ? "Station HQ reactivated" : undefined,
    });

    if (inactive) {
      const previousHqId = inactive.hqId;
      Object.assign(inactive, stationPayload, { isActive: true });
      inactive.auditHistory.push(auditEntry);
      await inactive.save();
      if (previousHqId && String(previousHqId) !== String(hqDoc._id)) {
        await removeStationFromHQ(previousHqId, inactive._id);
      }
      await syncStationOnHQ(hqDoc._id, inactive._id, stationPayload.name);
      const restored = await Station.findById(inactive._id)
        .populate("hqId", "name city state")
        .populate("state", "name code");
      res.status(201).json({ success: true, message: "Station restored successfully", data: restored });
      return;
    }

    const station = await Station.create({ ...stationPayload, auditHistory: [auditEntry] });
    await syncStationOnHQ(hqDoc._id, station._id, stationPayload.name);
    const populated = await Station.findById(station._id)
      .populate("hqId", "name city state")
      .populate("state", "name code");

    res.status(201).json({ success: true, message: "Station created successfully", data: populated });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE station ──────────────────────────────────────────────────────────
export const updateStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const before = await Station.findById(req.params.id);
    if (!before) {
      res.status(404).json({ success: false, message: "Station not found" });
      return;
    }

    const { hqId, hqName, state, ...rest } = req.body;
    const updateData: Record<string, unknown> = { ...rest };

    if (hqId) {
      const hqDoc = await resolveHQ(hqId);
      if (!hqDoc) {
        res.status(400).json({ success: false, message: "Invalid headquarters selected" });
        return;
      }
      updateData.hqId = hqDoc._id;
      updateData.hqName = (hqName || hqDoc.name).trim();
    }

    if (state) {
      const stateDoc = await resolveStateByName(String(state));
      if (!stateDoc) {
        res.status(400).json({ success: false, message: "Invalid state selected" });
        return;
      }
      updateData.state = stateDoc._id;
      updateData.stateCode = stateDoc.code;
      updateData.stateName = stateDoc.name;
    }

    const actor = (req as any).user;
    const auditEntry = buildAuditEntry(actor, "update");

    const station = await Station.findByIdAndUpdate(
      req.params.id,
      { ...updateData, $push: { auditHistory: auditEntry } },
      { new: true, runValidators: true }
    )
      .populate("hqId", "name city state")
      .populate("state", "name code");

    if (!station) { res.status(404).json({ success: false, message: "Station not found" }); return; }

    const oldHqId = before.hqId?.toString();
    const newHqId = station.hqId?.toString();
    if (oldHqId !== newHqId) {
      await removeStationFromHQ(before.hqId, station._id);
      if (station.hqId) {
        await syncStationOnHQ(station.hqId, station._id, station.name);
      }
    } else if (before.name !== station.name && station.hqId) {
      await syncStationOnHQ(station.hqId, station._id, station.name);
    }

    res.status(200).json({ success: true, message: "Station updated", data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE station (soft) ───────────────────────────────────────────────────
export const deleteStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const auditEntry = buildAuditEntry(actor, "status_toggle", { note: "Station HQ deactivated" });

    const station = await Station.findByIdAndUpdate(
      req.params.id,
      { isActive: false, $push: { auditHistory: auditEntry } },
      { new: true }
    );
    if (!station) { res.status(404).json({ success: false, message: "Station not found" }); return; }
    await removeStationFromHQ(station.hqId, station._id);
    res.status(200).json({ success: true, message: "Station removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GENERATE QR for station ─────────────────────────────────────────────────
export const generateQRForStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) { res.status(404).json({ success: false, message: "Station not found" }); return; }

    const prefix = station.city.toUpperCase().slice(0, 3);
    const existingCount = await QRCode.countDocuments({ stationId: station._id });
    const code = `${prefix}-QR-${String(existingCount + 1).padStart(3, "0")}`;
    const qrData = `https://vitric-esm.in/grievance?station=${encodeURIComponent(station.name)}&code=${code}`;
    const svgContent = await qrcode.toString(qrData, { type: "svg", errorCorrectionLevel: "H", margin: 2 });

    await QRCode.updateMany({ stationId: station._id, status: "active" }, { status: "regenerated" });

    const qr = await QRCode.create({
      stationId: station._id, stationName: station.name,
      code, qrData, svgContent,
      generatedBy: (req as any).user?.id,
    });

    station.qrActive = true;
    station.qrCode = code;
    await station.save();

    res.status(201).json({ success: true, message: "QR Code generated", data: qr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};