import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Attach local variable values to stack frames for richer error context
  includeLocalVariables: true,

  enableLogs: true,

  integrations: [
    // AI monitoring for Vercel AI SDK (@ai-sdk/anthropic, @ai-sdk/google)
    Sentry.vercelAIIntegration(),
  ],
});
