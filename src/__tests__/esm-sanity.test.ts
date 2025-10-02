import { describe, it, expect } from "@jest/globals";

import { FameAddress } from "../naylence/fame/core/address/address";

describe("esm sanity", () => {
  it("constructs FameAddress", () => {
    const addr = new FameAddress("test@/foo");
    expect(addr.toString()).toBe("test@/foo");
  });
});
