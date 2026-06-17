import { translate } from "@vitalets/google-translate-api";

export interface TranslateResult {
  translatedText: string;
  detectedLang: string;
  failed: boolean;
}

/**
 * Translate `text` to `targetLang`.
 * Returns { translatedText, detectedLang, failed }.
 * On rate-limit (429) or timeout, failed = true and translatedText = original text.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang = "auto"
): Promise<TranslateResult> {
  if (!text || !text.trim()) {
    return { translatedText: text, detectedLang: sourceLang, failed: false };
  }

  try {
    const signal = AbortSignal.timeout(8000);
    const result = await translate(text, {
      to: targetLang,
      from: sourceLang === "auto" ? undefined : sourceLang,
      fetchOptions: { signal },
    });

    return {
      translatedText: result.text || text,
      detectedLang: result.raw?.src || sourceLang,
      failed: false,
    };
  } catch (err: any) {
    const isRateLimit =
      err?.name === "TooManyRequestsError" ||
      err?.statusCode === 429 ||
      String(err?.message).includes("429");
    const isTimeout =
      err?.name === "TimeoutError" ||
      err?.name === "AbortError" ||
      String(err?.message).toLowerCase().includes("timeout");

    if (isRateLimit) {
      console.warn("[translateService] Rate limit hit (429). Saving original text with translationFailed=true.");
    } else if (isTimeout) {
      console.warn("[translateService] Translation request timed out. Saving original text with translationFailed=true.");
    } else {
      console.error("[translateService] Translation error:", err?.message || err);
    }

    return { translatedText: text, detectedLang: sourceLang, failed: true };
  }
}

/**
 * Detect the source language of `text` and translate to the opposite language.
 * (If Hindi, translate to English. If English, translate to Hindi.)
 *
 * Returns:
 *   originalText   – the raw input
 *   translatedText – translated version (opposite language)
 *   language       – detected source language code ("en", "hi", etc.)
 *   translationFailed – true if translation API errored / rate-limited
 */
export async function detectAndTranslateToOpposite(text: string): Promise<{
  originalText: string;
  translatedText: string;
  language: string;
  translationFailed: boolean;
}> {
  if (!text || !text.trim()) {
    return {
      originalText: text,
      translatedText: text,
      language: "en",
      translationFailed: false,
    };
  }

  // First translate to EN to detect source language
  const resultToEn = await translateText(text, "en");
  const detectedLang = resultToEn.detectedLang || "en";

  if (resultToEn.failed) {
    return {
      originalText: text,
      translatedText: text,
      language: detectedLang,
      translationFailed: true,
    };
  }

  // If source was not English, the translated text to EN is our target
  if (detectedLang !== "en") {
    return {
      originalText: text,
      translatedText: resultToEn.translatedText,
      language: detectedLang,
      translationFailed: false,
    };
  }

  // If source IS English, we need to translate it to Hindi
  const resultToHi = await translateText(text, "hi", "en");
  return {
    originalText: text,
    translatedText: resultToHi.failed ? text : resultToHi.translatedText,
    language: "en",
    translationFailed: resultToHi.failed,
  };
}

/**
 * Translate `text` from English to `targetLang` (for admin → veteran direction).
 * Used when admin writes a comment in English and veteran reads in Hindi.
 */
export async function translateFromEnglish(
  text: string,
  targetLang: string
): Promise<{ translatedText: string; failed: boolean }> {
  if (!text || !text.trim() || targetLang === "en") {
    return { translatedText: text, failed: false };
  }

  const result = await translateText(text, targetLang, "en");
  return { translatedText: result.translatedText, failed: result.failed };
}
