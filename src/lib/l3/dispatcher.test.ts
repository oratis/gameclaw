import { describe, it, expect } from "vitest";
import { dispatchL3Task } from "./dispatcher";

describe("dispatchL3Task (M3 stub)", () => {
  it("returns failed with M3-not-live message", async () => {
    const result = await dispatchL3Task({
      taskId: "task_test",
      creds: { token: "fake" },
      task: { capability: "weekly_dungeon" },
      gameSlug: "arknights",
    });
    expect(result.status).toBe("failed");
    expect(result.message).toMatch(/M3|not yet deployed|vision-worker/i);
  });
});
