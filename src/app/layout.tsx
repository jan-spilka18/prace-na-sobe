import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Montserrat } from "next/font/google";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/config";
import "./globals.css";

/*
  Montserrat nese nadpisy, velká čísla a texty, kterými aplikace mluví
  (vize, úvodní průvodce). Běžný text v seznamech a tlačítkách zůstává
  systémový — na iOS je to SF Pro, které se v malých velikostech čte
  rychleji a nepůsobí jako web.

  latin-ext je kvůli české diakritice; bez něj by ě, š, ř spadly na
  náhradní písmo a nadpis by se rozpadl.
*/
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_SHORT_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    title: APP_SHORT_NAME,
    statusBarStyle: "default",
  },
  // Osobní rozvoj klientů nemá co dělat ve vyhledávačích.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#5FC3CE",
  // Bez `cover` zůstane pod home indicatorem na iPhonu bílý pruh.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  // Zvětšení nezakazujeme, je to přístupnostní funkce.
  maximumScale: 5,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Ruční volba vzhledu. „Podle telefonu" atribut nenastaví a o barvách
  // rozhodne prefers-color-scheme v globals.css.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="cs"
      data-theme={theme === "auto" ? undefined : theme}
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
