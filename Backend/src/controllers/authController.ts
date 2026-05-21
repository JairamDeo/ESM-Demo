import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin";
import User from "../models/User";

// ─── helpers ────────────────────────────────────────────────────────────────

const signToken = (id: string, role: string, station?: string): string =>
  jwt.sign({ id, role, station }, process.env.JWT_SECRET as string, {
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as jwt.SignOptions);

const generateOTP = (): string =>
  Math.floor(1000 + Math.random() * 9000).toString();

// ─── Admin Auth ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/admin/login
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: "Username and password are required" });
      return;
    }

    const admin = await Admin.findOne({ username: username.toLowerCase(), isActive: true }).select("+password");
    if (!admin) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // const isMatch = await admin.comparePassword(password);
    // if (!isMatch) {
    //   res.status(401).json({ success: false, message: "Invalid credentials" });
    //   return;
    // }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save({ validateBeforeSave: false });

    const token = signToken(admin._id.toString(), admin.role, admin.station);
    
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        station: admin.station,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/auth/admin/me
 */
export const getAdminMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = await Admin.findById((req as any).user.id);
    if (!admin) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }
    res.status(200).json({ success: true, admin });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/admin/logout
 */
export const adminLogout = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// ─── User (Veteran) OTP Auth ─────────────────────────────────────────────────

/**
 * POST /api/auth/user/send-otp
 * Body: { phone }
 */
export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone || phone.toString().length < 10) {
      res.status(400).json({ success: false, message: "Valid 10-digit phone number required" });
      return;
    }

    const otp = process.env.OTP_BYPASS === "true"
      ? (process.env.OTP_BYPASS_CODE || "1234")
      : generateOTP();

    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert user
    const user = await User.findOneAndUpdate(
      { phone },
      { phone, otp, otpExpiry, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // In production, send SMS here via SMS gateway
    console.log(`📱 OTP for ${phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      ...(process.env.OTP_BYPASS === "true" && {
        devNote: "OTP bypass enabled",
        otp,  // Only in dev — remove in production
      }),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/auth/user/verify-otp
 * Body: { phone, otp }
 */
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ success: false, message: "Phone and OTP are required" });
      return;
    }

    const user = await User.findOne({ phone, isActive: true });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found. Please request OTP first." });
      return;
    }

    // Check bypass
    const bypassEnabled = process.env.OTP_BYPASS === "true";
    const bypassCode = process.env.OTP_BYPASS_CODE || "1234";

    if (bypassEnabled && otp === bypassCode) {
      // Allow bypass
    } else {
      if (!user.otp || user.otp !== otp) {
        res.status(400).json({ success: false, message: "Invalid OTP" });
        return;
      }
      if (!user.otpExpiry || user.otpExpiry < new Date()) {
        res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
        return;
      }
    }

    // Clear OTP, mark verified
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id.toString(), "user");

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        rank: user.rank,
        serviceNumber: user.serviceNumber,
        stationHQ: user.stationHQ,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/auth/user/me
 */
export const getUserMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById((req as any).user.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
