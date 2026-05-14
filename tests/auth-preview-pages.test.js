import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AUTH_PREVIEW_PAGES } from "../src/utils/auth-preview-pages.js";

describe("auth preview pages", () => {
  it("keeps the three reference screens in the same order as the mockup", () => {
    assert.deepEqual(
      AUTH_PREVIEW_PAGES.map((page) => page.key),
      ["sign-in", "sign-up", "forgot-password"],
    );
  });
});
