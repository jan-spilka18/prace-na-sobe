import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { APP_DESCRIPTION, APP_NAME, APP_SHORT_NAME } from "@/lib/config";
import "./globals.css";

/*
  Fraunces nese nadpisy a velká čísla. Běžný text zůstává systémový —
  na iOS je to SF Pro, které se čte rychle a nepůsobí jako web.
  Serif jen na místech, kde má aplikace promluvit.

  latin-ext je kvůli české diakritice; bez něj by ě, š, ř spadly na
  náhradní písmo a nadpis by se rozpadl.
*/
const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
