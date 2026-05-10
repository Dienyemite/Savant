import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

const bundleAnalyzed = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);

export default withSentryConfig(bundleAnalyzed, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "savant",
  // Silence the Sentry CLI output during builds
  silent: !process.env.CI,
  // Upload source maps for accurate stack traces
  widenClientFileUpload: true,
  // Disable the Sentry SDK telemetry
  telemetry: false,
});
