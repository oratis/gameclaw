import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workerJob: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/l3/cloudrun", () => ({
  dispatchCloudRunJob: vi.fn(),
}));

vi.mock("@/lib/billing/circuit", () => ({
  checkCircuit: vi.fn(),
  updateCircuitForScope: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { dispatchL3Task } from "./dispatcher";
import { prisma } from "@/lib/prisma";
import { dispatchCloudRunJob } from "./cloudrun";
import { checkCircuit } from "@/lib/billing/circuit";

describe("dispatchL3Task", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkCircuit).mockResolvedValue({
      scope: "adapter:arknights",
      state: "closed",
      failureRate: 0,
      windowStart: new Date(),
      windowEnd: new Date(),
    });
    vi.mocked(prisma.workerJob.create).mockResolvedValue({
      id: "wj_1",
    } as never);
    vi.mocked(prisma.workerJob.update).mockResolvedValue({} as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches to Cloud Run Jobs and returns success on happy path", async () => {
    vi.mocked(dispatchCloudRunJob).mockResolvedValueOnce({
      executionName: "projects/x/locations/us-central1/jobs/y/executions/z",
      rawResponse: {},
    });

    const result = await dispatchL3Task({
      taskId: "task_test",
      creds: { hgToken: "x" },
      task: { capability: "weekly_dungeon" },
      gameSlug: "arknights",
    });

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/L3 worker dispatched/);
    expect(prisma.workerJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "task_test",
          pool: "l3-arknights",
          executionState: "PENDING",
        }),
      })
    );
  });

  it("returns failed on Cloud Run dispatch error", async () => {
    vi.mocked(dispatchCloudRunJob).mockRejectedValueOnce(
      new Error("Cloud Run job not found")
    );

    const result = await dispatchL3Task({
      taskId: "task_test",
      creds: { hgToken: "x" },
      task: { capability: "weekly_dungeon" },
      gameSlug: "arknights",
    });

    expect(result.status).toBe("failed");
    expect(result.message).toMatch(/Cloud Run job not found/);
  });

  it("skips dispatch when circuit is open", async () => {
    vi.mocked(checkCircuit).mockResolvedValueOnce({
      scope: "adapter:arknights",
      state: "open",
      failureRate: 0.6,
      windowStart: new Date(),
      windowEnd: new Date(),
    });

    const result = await dispatchL3Task({
      taskId: "task_test",
      creds: { hgToken: "x" },
      task: { capability: "weekly_dungeon" },
      gameSlug: "arknights",
    });

    expect(result.status).toBe("skipped");
    expect(result.message).toMatch(/circuit breaker is OPEN/);
    expect(dispatchCloudRunJob).not.toHaveBeenCalled();
  });

  it("normalizes -cn slugs into the same pool as the global counterpart", async () => {
    vi.mocked(dispatchCloudRunJob).mockResolvedValueOnce({
      executionName: "x",
      rawResponse: {},
    });

    await dispatchL3Task({
      taskId: "task_test",
      creds: {},
      task: { capability: "weekly_dungeon" },
      gameSlug: "starrail-cn",
    });

    expect(prisma.workerJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pool: "l3-starrail" }),
      })
    );
  });
});
