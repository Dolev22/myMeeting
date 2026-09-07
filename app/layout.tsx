import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { getLocale, dirFor } from "@/lib/i18n/locale";
import { I18nProvider } from "@/lib/i18n/client";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "myMeeting",
  description: "CRM לניהול לידים, פגישות ועסקאות",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} className={`${heebo.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans text-zinc-900 antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
