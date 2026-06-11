import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BrandThemeProvider } from "@/components/providers/brand-theme-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Athletic display face for headings and score/point numerals (Unit 8 signature).
const barlowSemiCondensed = Barlow_Semi_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

/**
 * Anti-FOUC bootstrap for the brand axis (mirrors how next-themes sets the
 * color scheme before paint). Reads the persisted brand and applies it to
 * <html data-theme> synchronously, before the first styled paint.
 */
const BRAND_BOOTSTRAP = `(function(){try{var b=localStorage.getItem("brand-theme");if(b!=="moderno"&&b!=="premium")b="deportivo";document.documentElement.setAttribute("data-theme",b);}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "Liga Mundial 2026", template: "%s · Liga Mundial 2026" },
  description: "Predice el Mundial 2026 con tus amigos. Crea tu liga y compite en el ranking.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="deportivo" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${barlowSemiCondensed.variable} antialiased`}
      >
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: trusted static bootstrap, no user input */}
        <script dangerouslySetInnerHTML={{ __html: BRAND_BOOTSTRAP }} />
        <ThemeProvider>
          <BrandThemeProvider>
            <AuthProvider>{children}</AuthProvider>
            <Toaster richColors closeButton />
          </BrandThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
