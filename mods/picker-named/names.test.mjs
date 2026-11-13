// Tests for names.js (pure, no Herdr runtime):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test names.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { tabMatch, firstPick } from "./names.js";

const pane = (pane, tab, terminal, title, program) => ({ pane, tab, terminal, title, program: { name: program } });
const PANES = [
  pane("p1", "tb1", "t1", "Refactor checkout", "Claude Code"),
  pane("p2", "tb1", "t2", "zsh", "zsh"),
  pane("p3", "tb1", "t3", "zsh", "zsh"),
  pane("p9", "tb2", "t9", "zsh", "zsh"),
];
const TERMINALS = [
  { address: "t1", labels: { "pane.name": "deploy staging" } },
  { address: "t2", labels: {} },
  { address: "t3", labels: { "pane.name": "logs app-01" } },
  { address: "t9", labels: { "pane.name": "deploy elsewhere" } },
];
const run = (filter, terminals = TERMINALS) =>
  tabMatch({ space: "Shop", tab: { id: "tb1", name: "api" }, programs: ["Claude Code"], panes: PANES, terminals, filter });
const names = (m) => m.panes.map((p) => p.name);

test("no filter shows every named pane of the tab, in order", () => {
  const m = run("");
  assert.equal(m.hit, true);
  assert.deepEqual(names(m), ["deploy staging", "logs app-01"]);
  assert.deepEqual(m.panes.map((p) => p.hit), [true, true]);
  assert.deepEqual(m.panes[0], { pane: "p1", terminal: "t1", name: "deploy staging", program: "Claude Code", hit: true });
});

test("pane-only hit leaves tab unmatched", () => {
  const m = run("deploy");
  assert.equal(m.hit, false);
  assert.deepEqual(names(m), ["deploy staging"]);
  assert.equal(m.panes[0].hit, true);
});

test("tab hit keeps all named panes, marks non-matching", () => {
  const m = run("api");
  assert.equal(m.hit, true);
  assert.deepEqual(names(m), ["deploy staging", "logs app-01"]);
  assert.deepEqual(m.panes.map((p) => p.hit), [false, false]);
});

test("terminal title matches the tab", () => {
  assert.equal(run("checkout").hit, true);
});

test("matches Slovenian letters case-insensitively", () => {
  const terminals = TERMINALS.map((t) => (t.address === "t3" ? { ...t, labels: { "pane.name": "ŠČ ž test" } } : t));
  const m = run("šč", terminals);
  assert.deepEqual(names(m), ["ŠČ ž test"]);
  assert.equal(m.panes[0].hit, true);
});

test("other tabs' panes are ignored", () => {
  assert.ok(!names(run("")).includes("deploy elsewhere"));
  assert.deepEqual(names(run("elsewhere")), []);
});

test("no match at all", () => {
  const m = run("nothing");
  assert.equal(m.hit, false);
  assert.deepEqual(m.panes, []);
});

// firstPick: rows as main.js builds them (heads already removed), each tab/pane row with its own hit.
const ctx = (id, hit) => ({ kind: "ctx", ctx: { id }, hit });
const prow = (id, tab, hit) => ({ kind: "pane", pane: id, ctx: { id: tab }, hit });

test("named pane wins when its tab also hits (title contains the filter)", () => {
  assert.equal(firstPick([ctx("tb1", true), prow("p1", "tb1", true), { kind: "new" }]), 1);
});

test("tab row stays picked when none of its panes hit", () => {
  assert.equal(firstPick([ctx("tb1", true), prow("p1", "tb1", false), ctx("tb2", true)]), 0);
});

test("pane-only hit picks the pane row", () => {
  assert.equal(firstPick([ctx("tb1", false), prow("p3", "tb1", false), prow("p1", "tb1", true)]), 2);
});

test("a hitting pane of a later tab does not steal the pick", () => {
  assert.equal(firstPick([ctx("tb1", true), ctx("tb2", false), prow("p9", "tb2", true)]), 0);
});

test("no hit picks the first row", () => {
  assert.equal(firstPick([ctx("tb1", false), { kind: "new" }]), 0);
});

test("mod pane titles do not match the tab", () => {
  const panes = [...PANES, { pane: "p4", tab: "tb1", terminal: null, title: "files", program: { name: "" } }];
  const m = tabMatch({ space: "Shop", tab: { id: "tb1", name: "api" }, programs: [], panes, terminals: TERMINALS, filter: "files" });
  assert.equal(m.hit, false);
});
