import dynamic from "next/dynamic";

export const metadata = {
  title: "API Reference · GameClaw",
  description:
    "Interactive OpenAPI 3.1 reference for the GameClaw API. Try requests against the live service from the docs.",
};

// Render swagger-ui client-side only — its CSS + DOM manipulation isn't SSR-safe.
const SwaggerExplorer = dynamic(() => import("./SwaggerExplorer"), {
  ssr: false,
  loading: () => (
    <div className="px-4 py-12 text-center text-sm text-gray-500">
      Loading API reference…
    </div>
  ),
});

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-bold text-gray-900">GameClaw API</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live OpenAPI 3.1 reference. Spec is served at{" "}
            <a href="/api/openapi.json" className="text-emerald-600 underline">
              /api/openapi.json
            </a>
            . Auth-required endpoints need an active session cookie — sign in at{" "}
            <a href="/signin" className="text-emerald-600 underline">/signin</a> first.
          </p>
        </div>
      </div>
      <SwaggerExplorer />
    </div>
  );
}
