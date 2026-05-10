import { describe, it, expect } from "vitest";
import { CAPABILITIES, PlanSchema } from "./schema";

describe("PlanSchema", () => {
  it("validates a minimal plan", () => {
    const result = PlanSchema.safeParse({
      reasoning: "Run daily check-ins.",
      tasks: [
        {
          gameSlug: "genshin",
          capability: "checkin",
          rationale: "Daily Primogems.",
        },
      ],
      unsupportedRequests: [],
    });
    expect(result.success).toBe(true);
  });

  it("validates an empty plan", () => {
    const result = PlanSchema.safeParse({
      reasoning: "Nothing to do.",
      tasks: [],
      unsupportedRequests: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown capability", () => {
    const result = PlanSchema.safeParse({
      reasoning: "test",
      tasks: [
        {
          gameSlug: "genshin",
          capability: "nuke_account",
          rationale: "x",
        },
      ],
      unsupportedRequests: [],
    });
    expect(result.success).toBe(false);
  });

  it("CAPABILITIES tuple includes all live capabilities", () => {
    expect(CAPABILITIES).toContain("checkin");
    expect(CAPABILITIES).toContain("bbs_daily_task");
    expect(CAPABILITIES).toContain("checkin_info");
    expect(CAPABILITIES).toContain("list_accounts");
  });
});
