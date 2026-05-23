import { Request, Response } from "express";
import Station from "../models/Station";
import QRCode from "../models/QRCode";
import qrcode from "qrcode";

// ─── Helper: get station filter based on role ────────────────────────────────
const getStationFilter = (req: Request): any => {
  const user = (req as any).user;
  if (!user || user.role === "super_admin") return {};
  if (user.station && user.station !== "Nagpur Sub-Area") {
    return { name: { $regex: user.station.replace(" Station HQ", ""), $options: "i" } };
  }
  return {};
};

// ─── GET all stations ────────────────────────────────────────────────────────
export const getStations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, state, qrActive, page = 1, limit = 20 } = req.query;

    const stationFilter = getStationFilter(req);
    const query: any = { isActive: true, ...stationFilter };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
      ];
    }
    if (state && (req as any).user?.role === "super_admin") {
      query.state = { $regex: state, $options: "i" };
    }
    if (qrActive !== undefined) query.qrActive = qrActive === "true";

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [stations, total] = await Promise.all([
      Station.find(query).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
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
    const station = await Station.findById(req.params.id);
    if (!station || !station.isActive) {
      res.status(404).json({ success: false, message: "Station not found" });
      return;
    }
    res.status(200).json({ success: true, data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CREATE station ──────────────────────────────────────────────────────────
export const createStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, city, state, address, officerCount, contactEmail, contactPhone } = req.body;

    if (!name || !city || !state) {
      res.status(400).json({ success: false, message: "name, city and state are required" });
      return;
    }

    const existing = await Station.findOne({ 
  name: { $regex: `^${name}$`, $options: "i" },
  isActive: true  // ← only check ACTIVE stations
});
if (existing) {
  res.status(409).json({ success: false, message: "Station with this name already exists" });
  return;
}

// If inactive station exists with same name — reactivate it instead of creating new
const inactive = await Station.findOne({ 
  name: { $regex: `^${name}$`, $options: "i" },
  isActive: false 
});
if (inactive) {
  inactive.isActive = true;
  inactive.city = city.trim();
  inactive.state = state.trim();
  inactive.officerCount = officerCount || 0;
  if (address) inactive.address = address;
  await inactive.save();
  res.status(201).json({ success: true, message: "Station restored successfully", data: inactive });
  return;
}

    const station = await Station.create({
      name: name.trim(), city: city.trim(), state: state.trim(),
      address, officerCount: officerCount || 0, contactEmail, contactPhone,
    });

    res.status(201).json({ success: true, message: "Station created successfully", data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── UPDATE station ──────────────────────────────────────────────────────────
export const updateStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const station = await Station.findByIdAndUpdate(req.params.id, { ...req.body }, { new: true, runValidators: true });
    if (!station) { res.status(404).json({ success: false, message: "Station not found" }); return; }
    res.status(200).json({ success: true, message: "Station updated", data: station });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE station (soft) ───────────────────────────────────────────────────
export const deleteStation = async (req: Request, res: Response): Promise<void> => {
  try {
    const station = await Station.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!station) { res.status(404).json({ success: false, message: "Station not found" }); return; }
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