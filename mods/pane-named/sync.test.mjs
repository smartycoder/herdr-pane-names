// Tests for sync.js (pure, no Herdr runtime):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test sync.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { userName, renameText, pullLabel } from "./sync.js";

const registry = (fields) => JSON.stringify({ pid: 4242, sessionId: "s-1", ...fields });

test("a name the person gave the session counts, trimmed", () => {
  assert.equal(userName(registry({ name: "  api server ", nameSource: "user" })), "api server");
});

test("a derived or automatic session name does not count", () => {
  assert.equal(userName(registry({ name: "devops", nameSource: "derived" })), null);
  assert.equal(userName(registry({ name: "Fix login", nameSource: "auto" })), null);
});

test("a missing, empty or broken registry gives no name", () => {
  assert.equal(userName(null), null);
  assert.equal(userName("{not json"), null);
  assert.equal(userName(registry({ name: "   ", nameSource: "user" })), null);
});

test("a new pane name renames the session", () => {
  assert.equal(renameText("api server", null), "/rename api server");
  assert.equal(renameText("api server", "backend"), "/rename api server");
});

test("a pane name on several lines is sent as one line", () => {
  assert.equal(renameText(" api\n  server ", null), "/rename api server");
});

test("an empty pane name or the session's own name sends nothing", () => {
  assert.equal(renameText("", "backend"), null);
  assert.equal(renameText("   ", null), null);
  assert.equal(renameText("backend", "backend"), null);
});

test("a new session name becomes the pane name", () => {
  assert.equal(pullLabel("", "backend"), "backend");
  assert.equal(pullLabel("api", "backend"), "backend");
});

test("no session name, or the pane's own name, changes nothing", () => {
  assert.equal(pullLabel("api", null), null);
  assert.equal(pullLabel("backend", "backend"), null);
});
