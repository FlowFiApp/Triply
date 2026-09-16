"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
            <span className="text-[40px]">⚠️</span>
            <h1 className="text-[20px] font-extrabold text-foreground">
              Something went wrong
            </h1>
            <p className="max-w-sm text-[14px] text-muted">
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
            <button
              onClick={reset}
              className="tap flex h-[44px] items-center rounded-xl bg-accent px-6 text-[14px] font-bold text-accent-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
