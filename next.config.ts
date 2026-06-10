import { withContentCollections } from "@content-collections/next";
import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

// Unit 2 theming uses next-themes, which injects a small inline bootstrap
// script to prevent a theme flash (FOUC). It is permitted by the existing
// `'unsafe-inline'` below while the CSP is report-only. Hardening path (NFR
// Design Pattern 2 / Infra Q1=A): drop `'unsafe-inline'` and allow the theme
// script by its `'sha256-<hash>'` before switching the CSP to enforce.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://${supabaseHostname} https://lh3.googleusercontent.com`,
  `connect-src 'self' https://${supabaseHostname} https://accounts.google.com https://oauth2.googleapis.com`,
  "frame-src https://accounts.google.com",
  "font-src 'self'",
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "lh3.googleusercontent.com" }, { hostname: supabaseHostname }],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspHeader },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withContentCollections(nextConfig);
