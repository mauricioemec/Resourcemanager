import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav/Sidebar";
import { LocaleProvider } from "@/lib/i18n/provider";
import { getLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Resource Management",
  description: "Matrix & regional engineering resource management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale}>
      <body>
        <LocaleProvider locale={locale}>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 px-8 py-7 max-w-[1500px]">{children}</main>
          </div>
        </LocaleProvider>
      </body>
    </html>
  );
}
