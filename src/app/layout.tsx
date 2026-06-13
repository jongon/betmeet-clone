import type { Metadata } from "next";
import { Barlow_Semi_Condensed, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/providers/auth-provider";
import { BrandThemeProvider } from "@/components/providers/brand-theme-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { BRAND_COOKIE, coerceBrand } from "@/lib/brand-theme";
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

export const metadata: Metadata = {
  title: { default: "Liga Mundial 2026", template: "%s · Liga Mundial 2026" },
  description: "Predice el Mundial 2026 con tus amigos. Crea tu liga y compite en el ranking.",
  icons: {
    icon: "/icon.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Anti-FOUC for the brand axis without an inline script (FR-REFINE-16.6, CF-8):
  // render <html data-theme> from the persisted cookie so the correct brand is in
  // the initial HTML before paint. Defaults to "deportivo" when unset/invalid.
  const brand = coerceBrand((await cookies()).get(BRAND_COOKIE)?.value);

  return (
    <html lang="es" data-theme={brand} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${barlowSemiCondensed.variable} antialiased`}
      >
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
