import { cookies } from "next/headers";
import { translate, DEFAULT_LOCALE, type Locale } from "./messages";

export function getLocale(): Locale {
  // Static export has no request cookies; fix the locale and avoid cookies()
  // (which would force dynamic rendering and break `output: export`).
  if (process.env.STATIC === "1") return DEFAULT_LOCALE;
  const c = cookies().get("locale")?.value;
  return c === "en" || c === "pt" ? c : DEFAULT_LOCALE;
}

/** Server-side translator bound to the current request locale. */
export function getT() {
  const locale = getLocale();
  return (key: string) => translate(locale, key);
}
