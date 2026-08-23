import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Officer from "../models/Officer";
import User from "../models/User";

interface JwtPayload {
  id: string;
  role: string;
  station?: string;
  stateId?: string;
  hqId?: string;
  stationId?: string;
  stationName?: string;
  iat: number;
  exp: number;
}

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
      currentUser = await User.findById(decoded.id).select("name phone stationHQ isActive").lean();
    } else {
      currentUser = await Officer.findById(decoded.id)
        .select("canLogin status name email role level stateId stateName hqId hqName station stationName")
        .lean();
    }

    if (!currentUser) {
      res.status(401).json({ success: false, message: "User no longer exists." });
      return;
    }

    if (decoded.role !== "user") {
      if (!currentUser.canLogin || currentUser.status !== "active") {
        res.status(401).json({ success: false, message: "Your account has been deactivated." });
        return;
      }
    }

    if (decoded.role === "user") {
      (req as any).user = {
        id: currentUser._id.toString(),
        name: currentUser.name || `+91 ${currentUser.phone}`,
        role: "user",
        phone: currentUser.phone,
        station: currentUser.stationHQ,
      };
    } else {
      (req as any).user = {
        id: currentUser._id.toString(),
        name: currentUser.name,
        role: decoded.role,
        jobRole: currentUser.role,
        email: currentUser.email,
        level: currentUser.level,
        station: decoded.station || currentUser.stationName || currentUser.stateName || currentUser.hqName,
        stateId: decoded.stateId || currentUser.stateId?.toString(),
        stateName: currentUser.stateName,
        hqId: decoded.hqId || currentUser.hqId?.toString(),
        hqName: currentUser.hqName,
        stationId: decoded.stationId || currentUser.station?.toString(),
        stationName: decoded.stationName || currentUser.stationName,
      };
    }

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

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!roles.includes((req as any).user.role)) {
      res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
      return;
    }
    next();
  };
};

export const adminOnly = restrictTo("super_admin", "area", "headquarter", "station_hq");

export const getStationFilter = (user: any): string | null => {
  if (user.role === "super_admin") return null;
  return user.station || null;
};
