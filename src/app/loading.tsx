// Suspense boundary loading state for the root app route

export default function Loading() {
  return (
    <div
      className="fixed inset-0 bg-black flex items-center justify-center"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <span className="text-[10px] tracking-[0.3em] uppercase text-white/20 animate-pulse">
        Loading
      </span>
    </div>
  );
}
