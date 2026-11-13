// Tests for label.js (pure, no Herdr runtime):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test label.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextLabel, readLabel } from "./label.js";

test("unchanged name writes nothing", () => {
  assert.equal(nextLabel("api server", "api server"), null);
});

test("padding around an unchanged name writes nothing", () => {
  assert.equal(nextLabel("  api server ", "api server"), null);
});

test("empty input removes the name", () => {
  assert.equal(nextLabel("   ", "api server"), "");
});

test("empty input on an unnamed pane writes nothing", () => {
  assert.equal(nextLabel("", ""), null);
});

test("a new name is trimmed", () => {
  assert.equal(nextLabel("  db migrations ", "api server"), "db migrations");
});

test("readLabel trims and treats whitespace as unnamed", () => {
  const terminals = [{ address: "t1", labels: { "pane.name": "  api server " } }, { address: "t2", labels: { "pane.name": "   " } }, { address: "t3" }];
  assert.equal(readLabel(terminals, "t1"), "api server");
  assert.equal(readLabel(terminals, "t2"), "");
  assert.equal(readLabel(terminals, "t3"), "");
  assert.equal(readLabel(terminals, "t9"), "");
  assert.equal(readLabel(terminals, null), "");
});
