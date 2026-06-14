import { Request, Response } from "express";
import mongoose from "mongoose";
import Announcement from "../models/Announcement";
import Officer from "../models/Officer";
import Notification from "../models/Notification";
import { sendPushToRecipient } from "../services/notificationService";
import { isAnnouncementSmsEnabled, sendAnnouncementSms } from "../services/msg91Service";

async function resolveTargetOfficers(targetStationIds: mongoose.Types.ObjectId[]) {
  const filter: Record<string, unknown> = { status: "active", canLogin: true };
  if (targetStationIds.length > 0) {
    filter.station = { $in: targetStationIds };
  }
  return Officer.find(filter).lean();
}

export const createAnnouncement = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, targetStations, sentViaSMS, sentViaPush } = req.body;

    if (!title || !message) {
      res.status(400).json({ success: false, message: "Title and message are required" });
      return;
    }

    if (!sentViaSMS && !sentViaPush) {
      res.status(400).json({
        success: false,
        message: "Select at least one delivery method (SMS or Push Notification)",
      });
      return;
    }

    if (sentViaSMS && !isAnnouncementSmsEnabled()) {
      res.status(400).json({
        success: false,
        message: "SMS is not configured. Add MSG91_FLOW_ANNOUNCEMENT to your environment.",
      });
      return;
    }

    const actor = (req as any).user;
    const stationIds: mongoose.Types.ObjectId[] = Array.isArray(targetStations)
      ? targetStations
          .filter(Boolean)
          .map((id: string) => new mongoose.Types.ObjectId(id))
      : [];

    const announcement = await Announcement.create({
      title,
      message,
      targetStations: stationIds,
      sentViaSMS: !!sentViaSMS,
      sentViaPush: !!sentViaPush,
      createdBy: actor.name || "Admin",
      hqId: actor.role === "headquarter" ? actor.id : undefined,
    });

    const officers = await resolveTargetOfficers(stationIds);
    let smsSent = 0;
    let pushSent = 0;
    let inAppSent = 0;

    for (const officer of officers) {
      await Notification.create({
        recipientId: officer._id,
        recipientType: "admin",
        title: `Announcement: ${title}`,
        message,
        type: "system",
      });
      inAppSent += 1;

      if (sentViaPush) {
        const count = await sendPushToRecipient(officer._id, "admin", {
          title: `Announcement: ${title}`,
          body: message,
          url: "/announcements",
        });
        pushSent += count;
      }

      if (sentViaSMS && officer.phone) {
        try {
          await sendAnnouncementSms(officer.phone, {
            name: officer.name,
            title,
            message,
          });
          smsSent += 1;
        } catch (err: any) {
          console.error(`[SMS] Failed for officer ${officer.name}:`, err?.message || err);
        }
      }
    }

    res.status(201).json({
      success: true,
      data: announcement,
      message: "Announcement sent successfully",
      delivery: {
        officersTargeted: officers.length,
        inAppSent,
        pushSent,
        smsSent,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAnnouncements = async (req: Request, res: Response): Promise<void> => {
  try {
    const actor = (req as any).user;

    const filter: any = {};

    if (actor.role === "headquarter") {
      filter.hqId = actor.id;
    }

    const announcements = await Announcement.find(filter)
      .populate("targetStations", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
