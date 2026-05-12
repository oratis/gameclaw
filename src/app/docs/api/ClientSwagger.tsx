"use client";

import dynamic from "next/dynamic";

// Render swagger-ui client-side only — its CSS + DOM manipulation isn't SSR-safe.
// Must live inside a "use client" file because Next.js 16 forbids ssr:false
// on dynamic() calls from Server Components.
const SwaggerExplorer = dynamic(() => import("./SwaggerExplorer"), {
  ssr: false,
  loading: () => (
    <div className="px-4 py-12 text-center text-sm text-gray-500">
      Loading API reference…
    </div>
  ),
});

export function ClientSwagger() {
  return <SwaggerExplorer />;
}
