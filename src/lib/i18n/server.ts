import { cookies } from "next/headers";
import { translate, DEFAULT_LOCALE, type Locale } from "./messages";

export function getLocale(): Locale {
  const c = cookies().get("locale")?.value;
  return c === "en" || c === "pt" ? c : DEFAULT_LOCALE;
}

/** Server-side translator bound to the current request locale. */
export function getT() {
  const locale = getLocale();
  return (key: string) => translate(locale, key);
}
