import { Request, Response } from "express";
import Officer, { OFFICER_LEVELS } from "../models/Officer";
import Station from "../models/Station";
import { buildOfficerAssignment } from "../services/officerAssignment";
import { rbacRoleFromJobRole } from "../constants/officerRoles";
import { HIERARCHY_ORDER } from "../constants/officerHierarchy";
import {
  assertAssignmentInActorScope,
  assertCanCreateRole,
  auditActorFromRequest,
  getCreatableRoles,
  officerScopeQuery,
} from "../services/officerHierarchy";
import { OfficerJobRole } from "../constants/officerRoles";

function assignmentDisplay(o: {
  role: string;
  stateName?: string;
  hqName?: string;
  stationName?: string;
}): string {
  if (o.role === "Area Officer") return o.stateName || "—";
  if (o.role === "Headquarter Officer") {
    return [o.hqName, o.stateName].filter(Boolean).join(" · ") || "—";
  }
  if (o.role === "Station HQ Officer") {
    return [o.stationName, o.hqName, o.stateName].filter(Boolean).join(" · ") || "—";
  }
  if (o.role === "Super Admin") return "Vitric — All areas";
  return o.stationName || "—";
}

function actorCanManageTarget(actor: any, target: any): boolean {
  if (actor.role === "super_admin") return true;
  if (actor.role === "area" && actor.stateId) {
    return target.stateId?.toString() === actor.stateId;
  }
  if (actor.role === "headquarter" && actor.hqId) {
    return target.hqId?.toString() === actor.hqId;
  }
  return false;
}

export const getOfficerCreateOptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    res.status(200).json({
      success: true,
      data: {
        creatableRoles: getCreatableRoles(actor.role),
        hierarchy: HIERARCHY_ORDER,
        actor: {
          role: actor.role,
          jobRole: actor.jobRole,
          stateId: actor.stateId,
          stateName: actor.stateName,
          hqId: actor.hqId,
          hqName: actor.hqName,
          stationId: actor.stationId,
          stationName: actor.stationName,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOfficers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, station, status, page = 1, limit = 20 } = req.query;
    const scopeFilter = officerScopeQuery((req as any).user);
    const query: any = { ...scopeFilter };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { stationName: { $regex: search, $options: "i" } },
        { stateName: { $regex: search, $options: "i" } },
        { hqName: { $regex: search, $options: "i" } },
        { "createdBy.name": { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.role = role;
    if (station && (req as any).user?.role === "super_admin") {
      query.$or = [
        { stationName: { $regex: station, $options: "i" } },
        { stateName: { $regex: station, $options: "i" } },
        { hqName: { $regex: station, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [officers, total] = await Promise.all([
      Officer.find(query)
        .populate("station", "name city stateName hqName")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Officer.countDocuments(query),
    ]);

    const countFilter = { ...scopeFilter };
    const [areaCount, hqCount, stationCount, superCount] = await Promise.all([
      Officer.countDocuments({ ...countFilter, role: "Area Officer" }),
      Officer.countDocuments({ ...countFilter, role: "Headquarter Officer" }),
      Officer.countDocuments({ ...countFilter, role: "Station HQ Officer" }),
      Officer.countDocuments({ ...countFilter, role: "Super Admin" }),
    ]);

    const data = officers.map((o) => ({
      ...o.toJSON(),
      assignmentLabel: assignmentDisplay(o),
    }));

    res.status(200).json({
      success: true,
      data,
      summary: {
        esmOfficers: areaCount,
        stationOfficers: hqCount,
        recordOffice: stationCount,
        superAdmins: superCount,
      },
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOfficerById = async (req: Request, res: Response): Promise<void> => {
  try {
    const officer = await Officer.findById(req.params.id).populate("station", "name city stateName hqName");
    if (!officer) {
      res.status(404).json({ success: false, message: "Officer not found" });
      return;
    }
    res.status(200).json({
      success: true,
      data: { ...officer.toJSON(), assignmentLabel: assignmentDisplay(officer) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const {
      name,
      rank,
      role,
      email,
      phone,
      level,
      stateId,
      hqId,
      stationId,
      username,
      password,
      canLogin,
    } = req.body;

    if (!name || !role || !email) {
      res.status(400).json({ success: false, message: "name, role and email are required" });
      return;
    }

    try {
      assertCanCreateRole(actor, role as OfficerJobRole);
      await assertAssignmentInActorScope(actor, role as OfficerJobRole, { role, stateId, hqId, stationId });
    } catch (e: any) {
      res.status(403).json({ success: false, message: e.message });
      return;
    }

    if (role !== "Super Admin") {
      if (!level || !OFFICER_LEVELS.includes(level)) {
        res.status(400).json({ success: false, message: "level must be L1, L2, or L3" });
        return;
      }
    }

    const existing = await Officer.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: "Officer with this email already exists" });
      return;
    }

    let assignment;
    try {
      assignment = await buildOfficerAssignment({ role, stateId, hqId, stationId });
    } catch (e: any) {
      res.status(400).json({ success: false, message: e.message });
      return;
    }

    const wantsLogin = !!canLogin || !!username;
    if (wantsLogin) {
      if (!username || !password) {
        res.status(400).json({ success: false, message: "username and password required for portal login" });
        return;
      }
      const dup = await Officer.findOne({ username: username.toLowerCase() });
      if (dup) {
        res.status(409).json({ success: false, message: "Username already taken" });
        return;
      }
    }

    const audit = auditActorFromRequest(actor);

    const officer = await Officer.create({
      ...assignment,
      name: name.trim(),
      rank: rank?.trim() || "",
      role,
      level: role === "Super Admin" ? undefined : level,
      email: email.toLowerCase().trim(),
      phone,
      canLogin: wantsLogin,
      username: wantsLogin ? username.toLowerCase().trim() : undefined,
      password: wantsLogin ? password : undefined,
      createdBy: audit,
      updatedBy: audit,
    });

    if (officer.station) {
      await Station.findByIdAndUpdate(officer.station, { $inc: { officerCount: 1 } });
    }

    res.status(201).json({ success: true, message: "Officer added successfully", data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const existing = await Officer.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ success: false, message: "Officer not found" });
      return;
    }

    if (!actorCanManageTarget(actor, existing)) {
      res.status(403).json({ success: false, message: "You cannot modify this officer" });
      return;
    }

    const {
      name,
      rank,
      role,
      email,
      phone,
      level,
      status,
      stateId,
      hqId,
      stationId,
      username,
      password,
      canLogin,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (rank !== undefined) updateData.rank = rank?.trim() || "";
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;

    const nextRole = role ?? existing.role;
    if (role !== undefined && role !== existing.role) {
      try {
        assertCanCreateRole(actor, nextRole as OfficerJobRole);
      } catch (e: any) {
        res.status(403).json({ success: false, message: e.message });
        return;
      }
      updateData.role = role;
      updateData.rbacRole = rbacRoleFromJobRole(role);
    }

    if (level !== undefined) {
      if (nextRole !== "Super Admin" && level && !OFFICER_LEVELS.includes(level)) {
        res.status(400).json({ success: false, message: "level must be L1, L2, or L3" });
        return;
      }
      updateData.level = nextRole === "Super Admin" ? undefined : level;
    }

    const assignmentInput = {
      role: nextRole,
      stateId: stateId ?? existing.stateId?.toString(),
      hqId: hqId ?? existing.hqId?.toString(),
      stationId: stationId ?? existing.station?.toString(),
    };

    if (stateId !== undefined || hqId !== undefined || stationId !== undefined || role !== undefined) {
      try {
        await assertAssignmentInActorScope(actor, nextRole as OfficerJobRole, assignmentInput);
        const assignment = await buildOfficerAssignment(assignmentInput);
        Object.assign(updateData, assignment);
        const newStationId = "station" in assignment ? assignment.station : undefined;
        if (existing.station && newStationId?.toString() !== existing.station.toString()) {
          await Station.findByIdAndUpdate(existing.station, { $inc: { officerCount: -1 } });
        }
        if (newStationId) {
          await Station.findByIdAndUpdate(newStationId, { $inc: { officerCount: 1 } });
        }
      } catch (e: any) {
        res.status(400).json({ success: false, message: e.message });
        return;
      }
    }

    if (canLogin !== undefined || username !== undefined || password !== undefined) {
      const wantsLogin = canLogin ?? existing.canLogin;
      updateData.canLogin = wantsLogin;
      if (wantsLogin) {
        if (username) {
          const dup = await Officer.findOne({
            username: username.toLowerCase(),
            _id: { $ne: existing._id },
          });
          if (dup) {
            res.status(409).json({ success: false, message: "Username already taken" });
            return;
          }
          updateData.username = username.toLowerCase().trim();
        }
        if (password) updateData.password = password;
      } else {
        updateData.username = undefined;
        updateData.password = undefined;
      }
    }

    updateData.updatedBy = auditActorFromRequest(actor);

    const officer = await Officer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("station", "name city stateName hqName");

    if (!officer) {
      res.status(404).json({ success: false, message: "Officer not found" });
      return;
    }
    res.status(200).json({ success: true, message: "Officer updated", data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleOfficerStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const officer = await Officer.findById(req.params.id);
    if (!officer) {
      res.status(404).json({ success: false, message: "Officer not found" });
      return;
    }
    if (!actorCanManageTarget(actor, officer)) {
      res.status(403).json({ success: false, message: "You cannot modify this officer" });
      return;
    }
    officer.status = officer.status === "active" ? "inactive" : "active";
    officer.updatedBy = auditActorFromRequest(actor);
    await officer.save();
    res.status(200).json({ success: true, message: `Officer ${officer.status}`, data: officer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOfficer = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    const officer = await Officer.findById(req.params.id);
    if (!officer) {
      res.status(404).json({ success: false, message: "Officer not found" });
      return;
    }
    if (actor.role !== "super_admin") {
      res.status(403).json({ success: false, message: "Only Super Admin can delete officers" });
      return;
    }
    await Officer.findByIdAndDelete(req.params.id);
    if (officer.station) {
      await Station.findByIdAndUpdate(officer.station, { $inc: { officerCount: -1 } });
    }
    res.status(200).json({ success: true, message: "Officer deleted" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
