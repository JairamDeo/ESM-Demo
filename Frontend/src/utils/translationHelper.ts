import { useTranslation } from "react-i18next";

/**
 * Hook to resolve the correct text based on the current i18n language.
 * Useful for resolving dynamic translations where the MongoDB entity
 * has either `nameHi` / `descriptionHi` fields (for Categories/CaseTypes)
 * or `originalText` / `translatedText` / `language` fields (for Grievance/Comments).
 */
export function useDynamicTranslation() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";

  /**
   * Resolves text for static-like dynamic data (e.g. Category, CaseType, Documents)
   * that stores translations in parallel fields like `name` and `nameHi`.
   */
  const getField = (obj: any, baseField: string): string => {
    if (!obj) return "";
    
    if (currentLang === "hi") {
      const hiField = `${baseField}Hi`;
      if (obj[hiField] && typeof obj[hiField] === "string" && obj[hiField].trim() !== "") {
        return obj[hiField];
      }
    }
    
    // Fallback to the base field (usually English)
    return obj[baseField] || "";
  };

  /**
   * Resolves text for user-submitted data (e.g. Grievance description, Comments)
   * that stores translations in `originalText`, `translatedText`, and `language`.
   */
  const getUserText = (obj: any): string => {
    if (!obj) return "";

    const { originalText, translatedText, language } = obj;
    if (!originalText) return "";

    // If the original language matches the current user language, show original
    if (language === currentLang) {
      return originalText;
    }

    // Otherwise show the translated version (if available), fallback to original
    return translatedText || originalText;
  };

  return { currentLang, getField, getUserText };
}
