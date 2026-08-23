import { Request, Response } from "express";
import qrcode from "qrcode";
import QRCodeModel from "../models/QRCode";
import Station from "../models/Station";
import { getGrievanceScopeFilter } from "../utils/scopeFilter";
import { buildGrievanceQrUrl, resolveQrFrontendBase } from "../utils/network";

function stationQrPrefix(stationName: string): string {
  return stationName.replace(" Station HQ", "").replace(" HQ", "").toUpperCase().slice(0, 3);
}

async function nextUniqueQrCode(stationName: string): Promise<string> {
  const prefix = stationQrPrefix(stationName);
  const pattern = new RegExp(`^${prefix}-QR-(\\d+)$`, "i");
  const existing = await QRCodeModel.find({ code: pattern }).select("code").lean();

  let max = 0;
  for (const row of existing) {
    const n = parseInt(String(row.code).split("-")[2] || "0", 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }

  let next = max + 1;
  let code = `${prefix}-QR-${String(next).padStart(3, "0")}`;
  while (await QRCodeModel.exists({ code })) {
    next += 1;
    code = `${prefix}-QR-${String(next).padStart(3, "0")}`;
  }
  return code;
}

// ─── GET all QR codes ────────────────────────────────────────────────────────
export const getQRCodes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;

    const stationFilter = await getGrievanceScopeFilter((req as any).user);
    const query: any = { ...stationFilter };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { stationName: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const qrCodes = await QRCodeModel.find(query)
      .populate("stationId", "name city state")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: qrCodes });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET single QR code ──────────────────────────────────────────────────────
export const getQRCodeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QRCodeModel.findById(req.params.id).populate("stationId");
    if (!qr) { res.status(404).json({ success: false, message: "QR Code not found" }); return; }
    res.status(200).json({ success: true, data: qr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GENERATE new QR code ────────────────────────────────────────────────────
export const generateQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stationId, stationName, frontendUrl } = req.body;

    if (!stationName) {
      res.status(400).json({ success: false, message: "stationName is required" });
      return;
    }

    const codeUpper = await nextUniqueQrCode(stationName);

    const qrData = buildGrievanceQrUrl(resolveQrFrontendBase(req, frontendUrl), stationName, codeUpper);

    const svgContent = await qrcode.toString(qrData, { type: "svg", errorCorrectionLevel: "H", margin: 2 });

    let linkedStationId = stationId;
    if (!linkedStationId && stationName) {
      const station = await Station.findOne({ name: { $regex: stationName, $options: "i" } });
      if (station) {
        linkedStationId = station._id;
        station.qrActive = true;
        station.qrCode = codeUpper;
        await station.save();
      }
    }

    const qr = await QRCodeModel.create({
      stationId: linkedStationId, stationName,
      code: codeUpper,
      qrData, svgContent,
      generatedBy: (req as any).user?.id,
    });

    res.status(201).json({ success: true, message: "QR Code generated", data: qr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VIEW QR code — returns SVG ──────────────────────────────────────────────
export const viewQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QRCodeModel.findById(req.params.id);
    if (!qr) { res.status(404).json({ success: false, message: "QR Code not found" }); return; }

    if (qr.svgContent) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(qr.svgContent);
    } else {
      const svg = await qrcode.toString(qr.qrData, { type: "svg", errorCorrectionLevel: "H", margin: 2 });
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svg);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DOWNLOAD QR code as PNG ─────────────────────────────────────────────────
export const downloadQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QRCodeModel.findById(req.params.id);
    if (!qr) { res.status(404).json({ success: false, message: "QR Code not found" }); return; }

    const pngBuffer = await qrcode.toBuffer(qr.qrData, {
      type: "png", width: 512, margin: 2, errorCorrectionLevel: "H",
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${qr.code}.png"`);
    res.send(pngBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REGENERATE QR code ──────────────────────────────────────────────────────
export const regenerateQRCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const oldQR = await QRCodeModel.findById(req.params.id);
    if (!oldQR) { res.status(404).json({ success: false, message: "QR Code not found" }); return; }

    oldQR.status = "regenerated";
    await oldQR.save();

    const newCode = await nextUniqueQrCode(oldQR.stationName);
    const newQrData = buildGrievanceQrUrl(
      resolveQrFrontendBase(req, req.body?.frontendUrl),
      oldQR.stationName,
      newCode
    );
    const svgContent = await qrcode.toString(newQrData, { type: "svg", errorCorrectionLevel: "H", margin: 2 });

    const newQR = await QRCodeModel.create({
      stationId: oldQR.stationId, stationName: oldQR.stationName,
      code: newCode, qrData: newQrData, svgContent,
      generatedBy: (req as any).user?.id,
    });

    res.status(201).json({ success: true, message: "QR Code regenerated", data: newQR });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── RECORD a scan ───────────────────────────────────────────────────────────
export const recordScan = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const qr = await QRCodeModel.findOneAndUpdate(
      { code: (code as string).toUpperCase(), status: "active" },
      { $inc: { totalScans: 1 }, lastScannedAt: new Date() },
      { new: true }
    );

    if (!qr) { res.status(404).json({ success: false, message: "Active QR Code not found" }); return; }

    res.status(200).json({
      success: true, message: "Scan recorded",
      data: { stationName: qr.stationName, code: qr.code, totalScans: qr.totalScans, grievanceUrl: qr.qrData },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── TOGGLE QR status ────────────────────────────────────────────────────────
export const toggleQRStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QRCodeModel.findById(req.params.id);
    if (!qr) { res.status(404).json({ success: false, message: "QR Code not found" }); return; }

    qr.status = qr.status === "active" ? "inactive" : "active";
    await qr.save();

    await Station.findByIdAndUpdate(qr.stationId, { qrActive: qr.status === "active" });

    res.status(200).json({ success: true, message: `QR Code ${qr.status}`, data: qr });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};