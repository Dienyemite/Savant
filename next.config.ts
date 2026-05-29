import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

// Content Security Policy — spec-security §6
// 'unsafe-inline' is required for Framer Motion and Tailwind inline styles.
const cspHeader = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://use.typekit.net https://cdn.jsdelivr.net",
  "font-src 'self' https://use.typekit.net https://p.typekit.net",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "img-src 'self' data: blob:",
  "frame-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [{ key: "Content-Security-Policy", value: cspHeader }],
      },
    ];
  },
};

const bundleAnalyzed = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);

export default withSentryConfig(bundleAnalyzed, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "savant",

  // Source map upload auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload wider set of client source files for better stack trace resolution
  widenClientFileUpload: true,

  // Proxy Sentry requests through Next.js to bypass ad-blockers
  tunnelRoute: "/monitoring",

  // Suppress non-CI build output
  silent: !process.env.CI,

  // Disable the Sentry SDK telemetry
  telemetry: false,
});
