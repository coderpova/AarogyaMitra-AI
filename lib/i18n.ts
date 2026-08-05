import { translations, DEFAULT_LANGUAGE } from "@/locales";

/**
 * Retrieves a nested translation string by dot-notation key (e.g., "dashboard.title").
 * Supports fallback to English if string is missing in target locale.
 * Supports template parameter interpolation (e.g. {name}).
 */
export function t(
  lang: string,
  keyPath: string,
  params?: Record<string, string | number>
): string {
  const currentLocale = translations[lang] || translations[DEFAULT_LANGUAGE];
  const fallbackLocale = translations[DEFAULT_LANGUAGE];

  let value = getNestedValue(currentLocale, keyPath);

  if (value === undefined && currentLocale !== fallbackLocale) {
    value = getNestedValue(fallbackLocale, keyPath);
  }

  if (value === undefined) {
    console.warn(`Translation key missing: "${keyPath}" for language "${lang}"`);
    // Return last segment of keyPath as human fallback
    const keyParts = keyPath.split(".");
    return keyParts[keyParts.length - 1] || keyPath;
  }

  if (params && typeof value === "string") {
    Object.keys(params).forEach((paramKey) => {
      value = (value as string).replace(
        new RegExp(`\\{${paramKey}\\}`, "g"),
        String(params[paramKey])
      );
    });
  }

  return String(value);
}

function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }

  return current;
}
