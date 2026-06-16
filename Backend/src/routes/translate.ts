import { Router, Request, Response } from "express";
import { protect } from "../middleware/auth";
import { translateText, detectAndTranslateToEnglish } from "../services/translateService";

const router = Router();

/**
 * POST /api/translate
 * Body: { text: string, targetLang: string }
 * Returns: { success: true, translatedText: string, detectedLang: string }
 */
router.post("/", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, targetLang } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      res.status(400).json({ success: false, message: "text is required" });
      return;
    }

    if (!targetLang || typeof targetLang !== "string") {
      res.status(400).json({ success: false, message: "targetLang is required" });
      return;
    }

    if (targetLang === "en") {
      const result = await detectAndTranslateToEnglish(text);
      if (result.translationFailed) {
        res.status(503).json({
          success: false,
          message: "Translation service unavailable — rate limited or timed out",
          originalText: text,
        });
        return;
      }
      res.status(200).json({
        success: true,
        translatedText: result.translatedText,
        detectedLang: result.language,
      });
      return;
    }

    const result = await translateText(text, targetLang);
    if (result.failed) {
      res.status(503).json({
        success: false,
        message: "Translation service unavailable — rate limited or timed out",
        originalText: text,
      });
      return;
    }

    res.status(200).json({
      success: true,
      translatedText: result.translatedText,
      detectedLang: result.detectedLang,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
