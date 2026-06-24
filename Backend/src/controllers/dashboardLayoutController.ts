import { Request, Response } from "express";
import DashboardLayout from "../models/DashboardLayout";
import { jeDashboardLayoutDefaults } from "../utils/admin/DashboardLayoutDefaults";

// Shared with frontend defaults conceptually
export const dashboardLayoutDefaults = jeDashboardLayoutDefaults;

export const getLayout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const layout = await DashboardLayout.findOne({ userId });
    
    if (layout) {
      return res.status(200).json({ isCustom: true, layout: layout.widgets, dashboardName: layout.dashboardName });
    }
    
    return res.status(200).json({ isCustom: false, layout: dashboardLayoutDefaults, dashboardName: "Dashboard" });
  } catch (error) {
    console.error("Error fetching dashboard layout:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveLayout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { widgets, dashboardName } = req.body;

    if (!Array.isArray(widgets)) {
      return res.status(400).json({ message: "Invalid widgets format" });
    }

    const layout = await DashboardLayout.findOneAndUpdate(
      { userId },
      { widgets, dashboardName: dashboardName || "My Dashboard" },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: "Layout saved successfully", layout: layout.widgets });
  } catch (error) {
    console.error("Error saving dashboard layout:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetLayout = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    await DashboardLayout.findOneAndDelete({ userId });
    
    res.status(200).json({ message: "Layout reset successfully", layout: dashboardLayoutDefaults });
  } catch (error) {
    console.error("Error resetting dashboard layout:", error);
    res.status(500).json({ message: "Server error" });
  }
};
