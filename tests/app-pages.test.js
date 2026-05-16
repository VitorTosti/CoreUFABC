import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ACADEMIC_APP_PAGES } from "../src/utils/app-pages.js";

describe("academic app pages", () => {
  it("keeps the mobile app pages in the expected student-first order", () => {
    assert.deepEqual(
      ACADEMIC_APP_PAGES.map((page) => page.key),
      ["home", "planning", "performance", "history", "grade"],
    );
  });
});
