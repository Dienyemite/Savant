import "@testing-library/jest-dom";

// Provide stub Supabase env vars so supabase.ts doesn't throw during tests
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

// Mock ResizeObserver (not available in happy-dom/jsdom)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock window.getSelection
global.getSelection = () =>
  ({ getRangeAt: () => null, toString: () => "" }) as unknown as Selection;
