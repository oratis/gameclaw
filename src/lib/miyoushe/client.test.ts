import { describe, it, expect } from "vitest";
import { MiyousheClient } from "./client";

describe("MiyousheClient", () => {
  it("accepts valid cookie shape", () => {
    expect(
      () =>
        new MiyousheClient({
          cookieTokenV2: "v2_AbC.123-456_xyz=",
          accountIdV2: "12345678",
        })
    ).not.toThrow();
  });

  it("requires cookieTokenV2 and accountIdV2", () => {
    expect(
      () => new MiyousheClient({ cookieTokenV2: "", accountIdV2: "12345678" })
    ).toThrow(/requires cookieTokenV2/);
    expect(
      () => new MiyousheClient({ cookieTokenV2: "abc", accountIdV2: "" })
    ).toThrow(/requires cookieTokenV2/);
  });

  it("rejects header-injection characters in any cookie", () => {
    expect(
      () =>
        new MiyousheClient({
          cookieTokenV2: "tok\nen",
          accountIdV2: "12345678",
        })
    ).toThrow(/Invalid Miyoushe cookie/);
    expect(
      () =>
        new MiyousheClient({
          cookieTokenV2: "valid",
          accountIdV2: "12345678",
          accountMidV2: "mid; evil=1",
        })
    ).toThrow(/Invalid Miyoushe cookie/);
  });
});
