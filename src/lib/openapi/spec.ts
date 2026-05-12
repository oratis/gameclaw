/**
 * Hand-curated OpenAPI 3.1 spec for GameClaw's public + auth-required API.
 *
 * Goals:
 *   1. Serve as machine-readable API doc at /api/openapi.json
 *   2. Power the human /docs/api page (rendered from this spec)
 *   3. Live next to the code so it doesn't drift in isolation — when you
 *      add or change a route, update this file in the same commit.
 *
 * We don't generate from JSDoc / decorators because the routes are concise
 * and a single hand-written file is easier to keep accurate.
 */

export const OPENAPI_SPEC = {
  openapi: "3.1.0",
  info: {
    title: "GameClaw API",
    version: "1.0.0",
    description:
      "Cross-vendor AI game-boost API. Daily check-ins, BBS forum tasks, gift codes, real-time game state, and natural-language task planning across 10+ games (HoYoverse, 米游社, Kurogames, Hypergryph).",
    contact: {
      email: "hello@gogameclaw.com",
      url: "https://github.com/oratis/gameclaw",
    },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [{ url: "https://gogameclaw.com", description: "Production" }],
  tags: [
    { name: "adapters", description: "Game adapter registry (public)" },
    { name: "tasks", description: "Run individual adapter capabilities" },
    { name: "plan", description: "AI Planner — natural language → task plan" },
    { name: "templates", description: "Saved daily routines" },
    { name: "report", description: "AI-generated activity digests" },
    { name: "billing", description: "PayPal subscription + quota" },
    { name: "demand", description: "Public demand signal collection" },
    { name: "internal", description: "L3 worker internal endpoints (token-auth)" },
  ],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "NextAuth session cookie. Sign in at /signin to obtain.",
      },
      cronBearer: {
        type: "http",
        scheme: "bearer",
        description: "Bearer token equal to CRON_SECRET (Cloud Scheduler only).",
      },
      workerToken: {
        type: "apiKey",
        in: "header",
        name: "callbackToken (in body)",
        description:
          "One-time hex token from WorkerJob.callbackToken. Passed in the JSON body, not a header. Documented here for clarity.",
      },
    },
    schemas: {
      Capability: {
        type: "string",
        enum: [
          "checkin",
          "checkin_info",
          "list_accounts",
          "bbs_daily_task",
          "redeem_code",
          "account_status",
          "mail_claim",
          "stamina_spend",
          "weekly_dungeon",
          "infrastructure_shift",
          "material_farm",
          "auto_battle",
        ],
      },
      TaskStatus: {
        type: "string",
        enum: ["success", "already_done", "failed", "skipped", "running"],
      },
      AdapterMeta: {
        type: "object",
        properties: {
          slug: { type: "string", example: "genshin" },
          vendor: { type: "string", example: "hoyoverse" },
          displayName: { type: "string", example: "Genshin Impact" },
          authMethod: { type: "string", enum: ["cookie", "oauth", "token"] },
          capabilities: { type: "array", items: { $ref: "#/components/schemas/Capability" } },
          credentialFields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string" },
                label: { type: "string" },
                required: { type: "boolean" },
                sensitive: { type: "boolean" },
              },
            },
          },
        },
      },
      TaskResult: {
        type: "object",
        properties: {
          gameSlug: { type: "string" },
          capability: { $ref: "#/components/schemas/Capability" },
          taskId: { type: "string" },
          status: { $ref: "#/components/schemas/TaskStatus" },
          message: { type: "string" },
          reward: { type: "string", nullable: true },
          code: { type: "string", nullable: true, example: "quota_exceeded" },
        },
      },
      Plan: {
        type: "object",
        properties: {
          reasoning: { type: "string" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gameSlug: { type: "string" },
                capability: { $ref: "#/components/schemas/Capability" },
                rationale: { type: "string" },
              },
            },
          },
          unsupportedRequests: { type: "array", items: { type: "string" } },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          code: { type: "string", nullable: true },
        },
      },
    },
  },
  paths: {
    "/api/adapters": {
      get: {
        tags: ["adapters"],
        summary: "List all game adapters (public)",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    adapters: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AdapterMeta" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/tasks": {
      post: {
        tags: ["tasks"],
        summary: "Run one or more capability tasks (synchronous)",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    required: ["gameSlug", "capability"],
                    properties: {
                      gameSlug: { type: "string" },
                      capability: { $ref: "#/components/schemas/Capability" },
                      params: { type: "object" },
                    },
                  },
                  {
                    type: "object",
                    properties: {
                      tasks: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            gameSlug: { type: "string" },
                            capability: { $ref: "#/components/schemas/Capability" },
                            params: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Per-task results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TaskResult" },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "402": {
            description: "Quota exceeded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
              },
            },
          },
        },
      },
      get: {
        tags: ["tasks"],
        summary: "List caller's recent tasks",
        security: [{ sessionCookie: [] }],
        parameters: [
          { in: "query", name: "limit", schema: { type: "integer", default: 50, maximum: 200 } },
          { in: "query", name: "status", schema: { type: "string" } },
          { in: "query", name: "gameSlug", schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Task list",
            content: { "application/json": { schema: { type: "object" } } },
          },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/plan": {
      post: {
        tags: ["plan"],
        summary: "Generate a plan from natural language (synchronous)",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["prompt"],
                properties: {
                  prompt: { type: "string", maxLength: 1000 },
                  locale: { type: "string", example: "en" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Plan generated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    plan: { $ref: "#/components/schemas/Plan" },
                    usage: { type: "object" },
                    accounts: { type: "array" },
                  },
                },
              },
            },
          },
          "402": { description: "Plan-call quota exceeded" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/plan/stream": {
      post: {
        tags: ["plan"],
        summary:
          "Generate a plan from natural language (streaming SSE — same body as /api/plan)",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Server-Sent Events stream",
            content: { "text/event-stream": { schema: { type: "string" } } },
          },
        },
      },
    },
    "/api/plan/execute": {
      post: {
        tags: ["plan"],
        summary: "Execute the tasks of a previously-generated plan",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tasks: { type: "array", maxItems: 30 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Per-task results" } },
      },
    },
    "/api/templates": {
      get: {
        tags: ["templates"],
        summary: "List caller's TaskTemplates",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "Templates" } },
      },
      post: {
        tags: ["templates"],
        summary: "Save a new TaskTemplate",
        security: [{ sessionCookie: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "steps"],
                properties: {
                  name: { type: "string", maxLength: 80 },
                  schedule: { type: "string", nullable: true },
                  steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        gameSlug: { type: "string" },
                        capability: { $ref: "#/components/schemas/Capability" },
                        params: { type: "object" },
                        rationale: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Created" } },
      },
    },
    "/api/templates/{id}": {
      delete: {
        tags: ["templates"],
        summary: "Delete a TaskTemplate",
        security: [{ sessionCookie: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/api/templates/{id}/run": {
      post: {
        tags: ["templates"],
        summary: "Run a TaskTemplate",
        security: [{ sessionCookie: [] }],
        parameters: [
          { in: "path", name: "id", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Aggregated step results" } },
      },
    },
    "/api/report/weekly": {
      get: {
        tags: ["report"],
        summary: "AI Markdown digest of recent activity",
        security: [{ sessionCookie: [] }],
        parameters: [
          { in: "query", name: "days", schema: { type: "integer", default: 7 } },
          { in: "query", name: "locale", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Markdown digest" } },
      },
    },
    "/api/billing/subscribe": {
      post: {
        tags: ["billing"],
        summary: "Start a PayPal subscription",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "approvalUrl + paypalSubscriptionId" } },
      },
    },
    "/api/billing/cancel": {
      post: {
        tags: ["billing"],
        summary: "Cancel the active subscription",
        security: [{ sessionCookie: [] }],
        responses: { "200": { description: "ok" } },
      },
    },
    "/api/webhooks/paypal": {
      post: {
        tags: ["billing"],
        summary: "PayPal webhook receiver (signature-verified)",
        responses: { "200": { description: "Idempotent ack" } },
      },
    },
    "/api/demand": {
      post: {
        tags: ["demand"],
        summary: "Submit a public demand signal (rate-limited 5/h/IP)",
        responses: {
          "200": { description: "Stored" },
          "429": { description: "Rate-limited" },
        },
      },
    },
    "/api/cron/checkin": {
      post: {
        tags: ["internal"],
        summary: "Daily auto-checkin cron (Cloud Scheduler)",
        security: [{ cronBearer: [] }],
        responses: { "200": { description: "Run summary" } },
      },
    },
    "/api/cron/health": {
      post: {
        tags: ["internal"],
        summary: "Daily account-health cron (flags credential-expired accounts)",
        security: [{ cronBearer: [] }],
        responses: { "200": { description: "Run summary" } },
      },
    },
    "/api/internal/worker-callback": {
      post: {
        tags: ["internal"],
        summary: "L3 worker reports task progress / result",
        security: [{ workerToken: [] }],
        responses: { "200": { description: "ok" } },
      },
    },
    "/api/internal/worker-creds": {
      post: {
        tags: ["internal"],
        summary: "L3 worker fetches decrypted credentials + payload",
        security: [{ workerToken: [] }],
        responses: { "200": { description: "Credentials package" } },
      },
    },
    "/api/internal/worker-vision-help": {
      post: {
        tags: ["internal"],
        summary: "L3 worker asks Claude vision what UI action to take",
        security: [{ workerToken: [] }],
        responses: { "200": { description: "Action recommendation" } },
      },
    },
  },
} as const;
