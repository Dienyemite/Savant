"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

/**
 * /auth/confirm
 * Landing page shown after a user clicks the email confirmation link.
 * Supabase redirects to /auth/callback?code=... which exchanges the code
 * and then redirects here (or straight to /dashboard).
 */
export default function ConfirmPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setStatus("error");
      return;
    }
    // If we landed here without an error, the callback already verified the session.
    setStatus("success");
    const t = setTimeout(() => router.push("/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-white/40 animate-spin mx-auto" />
            <p className="text-white/50 text-sm">Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-white mx-auto" />
            <p className="text-white font-medium">Email confirmed!</p>
            <p className="text-white/40 text-sm">Redirecting to your dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-white/50 mx-auto" />
            <p className="text-white/70 font-medium">Confirmation failed</p>
            <p className="text-white/40 text-sm">The link may have expired.</p>
            <button
              onClick={() => router.push("/onboarding")}
              className="mt-4 px-5 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 transition-colors"
            >
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
