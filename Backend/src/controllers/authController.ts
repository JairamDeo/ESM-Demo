import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Officer from "../models/Officer";
import User from "../models/User";
import { loginScopeLabel } from "../services/officerAssignment";
import { rbacRoleFromJobRole } from "../constants/officerRoles";
import {
  isOtpBypassEnabled,
  isOtpSmsEnabled,
  OTP_EXPIRY_SECONDS,
  OTP_RESEND_COOLDOWN_SECONDS,
  sendLoginOtpSms,
} from "../services/msg91Service";

const signToken = (
  id: string,
  role: string,
  scope?: {
    station?: string;
    stateId?: string;
    hqId?: string;
    stationId?: string;
    stationName?: string;
  }
): string =>
  jwt.sign(
    { id, role, ...scope },
    process.env.JWT_SECRET as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
  );

const generateOTP = (): string => crypto.randomInt(1000, 10000).toString();

/**
 * POST /api/auth/admin/login — portal login via officers collection (canLogin: true).
 */
export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: "Username and password are required" });
      return;
    }

    const loginId = String(username).toLowerCase().trim();

    const officer = await Officer.findOne({
      canLogin: true,
      status: "active",
      $or: [{ username: loginId }, { email: loginId }],
    }).select("+password");

    if (!officer) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const isMatch = await officer.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    void Officer.updateOne({ _id: officer._id }, { lastLogin: new Date() });

    const scopeLabel = loginScopeLabel({
      rbacRole: officer.rbacRole,
      stateName: officer.stateName,
      hqName: officer.hqName,
      stationName: officer.stationName,
    });

    const rbacRole = officer.rbacRole || rbacRoleFromJobRole(officer.role);
    const token = signToken(officer._id.toString(), rbacRole, {
      station: scopeLabel,
      stateId: officer.stateId?.toString(),
      hqId: officer.hqId?.toString(),
      stationId: officer.station?.toString(),
      stationName: officer.stationName,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: officer._id.toString(),
        username: officer.username,
        name: officer.name,
        email: officer.email,
        role: rbacRole,
        jobRole: officer.role,
        station: scopeLabel,
        level: officer.level,
        stateId: officer.stateId?.toString(),
        stateName: officer.stateName,
        hqId: officer.hqId?.toString(),
        hqName: officer.hqName,
        stationId: officer.station?.toString(),
        stationName: officer.stationName,
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
    const officer = await Officer.findById((req as any).user.id);
    if (!officer || !officer.canLogin) {
      res.status(404).json({ success: false, message: "Officer account not found" });
      return;
    }
    res.status(200).json({
      success: true,
      admin: {
        id: officer._id.toString(),
        username: officer.username,
        name: officer.name,
        email: officer.email,
        role: officer.rbacRole || rbacRoleFromJobRole(officer.role),
        jobRole: officer.role,
        station: loginScopeLabel({
          rbacRole: officer.rbacRole || rbacRoleFromJobRole(officer.role),
          stateName: officer.stateName,
          hqName: officer.hqName,
          stationName: officer.stationName,
        }),
        level: officer.level,
        stateId: officer.stateId,
        stateName: officer.stateName,
        hqId: officer.hqId,
        hqName: officer.hqName,
        stationId: officer.station,
        stationName: officer.stationName,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminLogout = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

export const sendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;

    if (!phone || phone.toString().replace(/\D/g, "").length < 10) {
      res.status(400).json({ success: false, message: "Valid 10-digit phone number required" });
      return;
    }

    const normalizedPhone = phone.toString().replace(/\D/g, "").slice(-10);
    const existing = await User.findOne({ phone: normalizedPhone }).select("otpSentAt").lean();

    if (existing?.otpSentAt) {
      const elapsed = Date.now() - existing.otpSentAt.getTime();
      const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;
      if (elapsed < cooldownMs) {
        const retryAfter = Math.ceil((cooldownMs - elapsed) / 1000);
        res.status(429).json({
          success: false,
          message: `Please wait ${retryAfter}s before requesting a new OTP`,
          retryAfter,
          resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
        });
        return;
      }
    }

    const bypass = isOtpBypassEnabled();
    const smsEnabled = isOtpSmsEnabled();
    const otp = bypass ? process.env.OTP_BYPASS_CODE || "1234" : generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);
    const otpSentAt = new Date();

    await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { phone: normalizedPhone, otp, otpExpiry, otpSentAt, isActive: true },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    let smsSent = false;
    if (!bypass && smsEnabled) {
      smsSent = true;
      void sendLoginOtpSms(normalizedPhone, otp).catch((err) => {
        console.error("OTP SMS failed:", err?.message || err);
      });
    } else if (!bypass) {
      console.log(`📱 OTP for ${normalizedPhone} (SMS disabled): ${otp}`);
    } else {
      console.log(`📱 OTP bypass for ${normalizedPhone}: ${otp}`);
    }

    res.status(200).json({
      success: true,
      message: smsSent ? "OTP sent to your mobile number" : "OTP generated successfully",
      expiresIn: OTP_EXPIRY_SECONDS,
      resendAfter: OTP_RESEND_COOLDOWN_SECONDS,
      smsSent,
      ...((bypass || !smsEnabled) && {
        devNote: bypass ? "OTP bypass enabled" : "OTP_ENABLE is false — SMS not sent",
        devOtp: otp,
      }),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Failed to send OTP" });
  }
};

export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      res.status(400).json({ success: false, message: "Phone and OTP are required" });
      return;
    }

    const normalizedPhone = phone.toString().replace(/\D/g, "").slice(-10);
    const user = await User.findOne({ phone: normalizedPhone, isActive: true });
    if (!user) {
      res.status(404).json({ success: false, message: "User not found. Please request OTP first." });
      return;
    }

    const bypassEnabled = isOtpBypassEnabled();
    const bypassCode = process.env.OTP_BYPASS_CODE || "1234";
    const otpValue = String(otp).trim();

    if (bypassEnabled && otpValue === bypassCode) {
      // allow dev bypass
    } else {
      if (!user.otp || user.otp !== otpValue) {
        res.status(400).json({ success: false, message: "Invalid OTP" });
        return;
      }
      if (!user.otpExpiry || user.otpExpiry < new Date()) {
        res.status(400).json({
          success: false,
          message: "OTP expired. Please request a new one.",
          expired: true,
        });
        return;
      }
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpSentAt = undefined;
    user.isVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const token = signToken(user._id.toString(), "user");

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      isNewUser: !user.name,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        rank: user.rank,
        serviceNumber: user.serviceNumber,
        armyNumber: user.armyNumber || user.serviceNumber,
        stationHQ: user.stationHQ,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
