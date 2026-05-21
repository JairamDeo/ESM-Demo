import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin";
import User from "../models/User";

interface JwtPayload {
        id:      string;
        role:    string;
        station?: string;  // ← add this
        iat:     number;
        exp:     number;
}

// ─── Attach user to request ──────────────────────────────────────────────────
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({ success: false, message: "Access denied. No token provided." });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    let currentUser: any = null;

    if (decoded.role === "user") {
      currentUser = await User.findById(decoded.id).select("-otp -otpExpiry");
    } else {
      currentUser = await Admin.findById(decoded.id);
    }

    if (!currentUser) {
      res.status(401).json({ success: false, message: "User no longer exists." });
      return;
    }

    if (decoded.role !== "user" && !currentUser.isActive) {
      res.status(401).json({ success: false, message: "Your account has been deactivated." });
      return;
    }

    (req as any).user = {
        id:      currentUser._id.toString(),
        name:    currentUser.name || currentUser.username,
        role:    decoded.role,
        email:   currentUser.email,
        station: decoded.station || currentUser.station || currentUser.stationHQ,
    };

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({ success: false, message: "Invalid token." });
    } else if (error.name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Token expired. Please login again." });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// ─── Role guard ──────────────────────────────────────────────────────────────
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
      return;
    }
    next();
  };
};

// ─── Admin only shortcut ─────────────────────────────────────────────────────
export const adminOnly = restrictTo("super_admin", "esm_officer", "station_officer", "record_office");

// ─── Station filter helper ────────────────────────────────────────────────────
export const getStationFilter = (user: any): string | null => {
  if (user.role === "super_admin") return null; // no filter
  return user.station || null; // filter by their station
};
