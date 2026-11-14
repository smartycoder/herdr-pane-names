// Tests for zoom.js (pure, no Herdr runtime):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test zoom.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { zoomBadge } from "./zoom.js";

const pane = (id, tab, zoomed = false) => ({ pane: id, tab, zoomed });

test("a pane that is not zoomed has no badge", () => {
  assert.equal(zoomBadge([pane("p1", "tb1"), pane("p2", "tb1")], "p1"), null);
});

test("a zoomed pane counts the other panes of its tab only", () => {
  const panes = [pane("p1", "tb1", true), pane("p2", "tb1"), pane("p3", "tb1"), pane("p4", "tb2")];
  assert.equal(zoomBadge(panes, "p1"), "Zoomed · 2 hidden");
});

test("a zoomed pane alone in its tab says only Zoomed", () => {
  assert.equal(zoomBadge([pane("p1", "tb1", true), pane("p2", "tb2")], "p1"), "Zoomed");
});

test("a pane missing from the list has no badge", () => {
  assert.equal(zoomBadge([pane("p1", "tb1", true)], "p9"), null);
});
