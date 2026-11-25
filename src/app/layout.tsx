import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Outfit } from "next/font/google";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/config";
import "./globals.css";

/*
  Dvě písma podle font manuálu Honzy Spilky:
  - Inter: nadpisy, tlačítka, čísla, štítky — všechno tučné.
  - Outfit: běžný text, popisky, odstavce.

  latin-ext je kvůli české diakritice; bez něj by ě, š, ř spadly na
  náhradní písmo a nadpis by se rozpadl.
*/
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  variable: "--font-outfit",
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
      className={`${inter.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
