"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, useLocale, useLocaleSwitch } from "@/lib/i18n/provider";
import { IS_STATIC } from "@/lib/static";

const ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: "◎" },
  { href: "/regions", key: "nav.regions", icon: "🌎" },
  { href: "/disciplines", key: "nav.disciplines", icon: "🛠" },
  { href: "/projects", key: "nav.projects", icon: "📁" },
  { href: "/resources", key: "nav.resources", icon: "👤" },
  { href: "/allocations", key: "nav.allocations", icon: "📊" },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const locale = useLocale();
  const switchLocale = useLocaleSwitch();

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-surface/60 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <div className="text-lg font-bold tracking-tight">{t("app.title")}</div>
        <div className="text-xs text-muted mt-0.5">{t("app.subtitle")}</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {ITEMS.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-brand/20 text-white font-medium" : "text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              <span className="text-base">{it.icon}</span>
              {t(it.key)}
            </Link>
          );
        })}
      </nav>
      <div className={`px-3 py-4 border-t border-border flex gap-1 ${IS_STATIC ? "hidden" : ""}`}>
        {(["pt", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => switchLocale(l)}
            className={`flex-1 text-xs py-1.5 rounded-md uppercase font-semibold tracking-wide ${
              locale === l ? "bg-brand text-white" : "bg-surface-2 text-muted hover:text-text"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </aside>
  );
}
