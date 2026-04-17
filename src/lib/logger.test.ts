import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits info to stdout as JSON with severity", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    logger.info("user signed in", { userId: "abc" });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const line = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line.trim());
    expect(parsed.severity).toBe("INFO");
    expect(parsed.message).toBe("user signed in");
    expect(parsed.userId).toBe("abc");
    expect(parsed.timestamp).toBeTruthy();
  });

  it("emits error to stderr with error details", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const err = new Error("boom");
    logger.error("checkin failed", err, { gameId: "genshin" });

    expect(writeSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(parsed.severity).toBe("ERROR");
    expect(parsed.errorName).toBe("Error");
    expect(parsed.errorMessage).toBe("boom");
    expect(parsed.gameId).toBe("genshin");
    expect(parsed.stack).toContain("Error: boom");
  });

  it("emits warning to stderr", () => {
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    logger.warn("rate limited", { retries: 3 });

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("handles non-Error values in error()", () => {
    const writeSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    logger.error("odd", "not an error");

    const parsed = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(parsed.error).toBe("not an error");
  });
});
