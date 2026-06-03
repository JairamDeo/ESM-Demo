import { Request, Response } from "express";
import Announcement from "../models/Announcement";

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, targetStations, sentViaSMS, sentViaPush } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, message: "Title and message are required" });
      return;
    }

    const actor = (req as any).user;
    
    // Create the announcement
    const announcement = await Announcement.create({
      title,
      message,
      targetStations: targetStations || [],
      sentViaSMS: !!sentViaSMS,
      sentViaPush: !!sentViaPush,
      createdBy: actor.name || "Admin",
      hqId: actor.role === "headquarter" ? actor.id : undefined, // Track HQ ID if it's an HQ sending
    });

    // Simulate sending logic
    if (sentViaSMS) {
      console.log(`[SMS] Sending announcement "${title}" to stations: ${targetStations.length > 0 ? targetStations.join(", ") : "ALL"}`);
    }
    if (sentViaPush) {
      console.log(`[PUSH] Sending push notification "${title}" to stations: ${targetStations.length > 0 ? targetStations.join(", ") : "ALL"}`);
    }

    res.status(201).json({ success: true, data: announcement, message: "Announcement sent successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;
    
    // Base filter
    const filter: any = {};
    
    // If the user is Headquarter, they only see announcements they created
    if (actor.role === "headquarter") {
      filter.hqId = actor.id;
    }
    // Super admin and area might see all announcements

    const announcements = await Announcement.find(filter)
      .populate("targetStations", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
