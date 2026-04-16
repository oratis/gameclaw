"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
          <div className="mx-auto max-w-md">
            <h2 className="mb-4 text-2xl font-bold">Something went wrong</h2>
            <p className="mb-6 text-gray-400">
              A critical error occurred. Please refresh the page.
            </p>
            <button
              onClick={reset}
              className="rounded-lg bg-emerald-500 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-600"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
