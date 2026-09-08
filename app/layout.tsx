import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getLocale, dirFor } from "@/lib/i18n/locale";
import { I18nProvider } from "@/lib/i18n/client";
import { getTheme } from "@/lib/theme/get-theme";
import { THEME_COOKIE } from "@/lib/theme/constants";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "myMeeting",
  description: "CRM לניהול לידים, פגישות ועסקאות",
};

// Runs before hydration so a first-ever visit (no theme cookie yet) still
// reflects the OS preference immediately, with no flash — the manual
// toggle then takes over and persists an explicit choice via the cookie,
// which is what every later render (SSR included) reads.
const themeInitScript = `
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);
    var theme = match ? decodeURIComponent(match[1]) : null;
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);
  const dir = dirFor(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${heebo.variable} h-full ${theme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
