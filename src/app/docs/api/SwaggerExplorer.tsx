"use client";

// swagger-ui-react ships its own light theme; intentionally not bundled with
// our Tailwind dark theme.
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerExplorer() {
  return (
    <div className="swagger-wrapper">
      <SwaggerUI
        url="/api/openapi.json"
        docExpansion="list"
        defaultModelsExpandDepth={0}
        tryItOutEnabled
      />
    </div>
  );
}
