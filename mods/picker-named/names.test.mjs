// Tests for names.js (pure, no Herdr runtime):
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test names.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { tabMatch, firstPick, rowKey } from "./names.js";

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
  assert.deepEqual(m.panes[0], { pane: "p1", name: "deploy staging", program: "Claude Code", hit: true });
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
  // A mod pane has no terminal and no program (herdr.d.ts PaneInfo).
  const panes = [...PANES, { pane: "p4", tab: "tb1", terminal: null, title: "files" }];
  const m = tabMatch({ space: "Shop", tab: { id: "tb1", name: "api" }, programs: [], panes, terminals: TERMINALS, filter: "files" });
  assert.equal(m.hit, false);
});

test("labels of only spaces count as unnamed, names are trimmed", () => {
  const terminals = TERMINALS.map((t) =>
    t.address === "t1" ? { ...t, labels: { "pane.name": "   " } } : t.address === "t3" ? { ...t, labels: { "pane.name": "  logs app-01 " } } : t);
  assert.deepEqual(names(run("", terminals)), ["logs app-01"]);
});

test("a pane whose terminal is unknown has no name", () => {
  assert.deepEqual(names(run("", TERMINALS.filter((t) => t.address !== "t1"))), ["logs app-01"]);
});

test("machine-qualified addresses match exactly, never a local terminal", () => {
  const panes = [pane("r1", "tb1", "vps/t7", "zsh", "zsh")];
  const terminals = [{ address: "t7", labels: { "pane.name": "local seven" } }, { address: "vps/t7", labels: { "pane.name": "remote seven" } }];
  const m = tabMatch({ space: "Shop", tab: { id: "tb1", name: "api" }, programs: [], panes, terminals, filter: "" });
  assert.deepEqual(names(m), ["remote seven"]);
});

test("tab hits on its space name alone", () => {
  assert.equal(run("shop").hit, true);
});

test("tab hits on an agent program alone", () => {
  assert.equal(run("claude").hit, true);
});

test("a hitting pane after a non-hitting one under a hitting tab is picked", () => {
  assert.equal(firstPick([ctx("tb1", true), prow("p3", "tb1", false), prow("p1", "tb1", true)]), 2);
});

test("rows without a hit before the first hit are skipped", () => {
  assert.equal(firstPick([{ kind: "earlier" }, ctx("tb1", true), { kind: "new" }]), 1);
});

test("rowKey identifies a row across rebuilds", () => {
  assert.equal(rowKey(ctx("tb1", true)), "ctx:tb1");
  assert.equal(rowKey(prow("p1", "tb1", false)), "pane:p1");
  assert.equal(rowKey({ kind: "space", machine: null }), "space:");
  assert.equal(rowKey({ kind: "space", machine: "vps" }), "space:vps");
  assert.equal(rowKey({ kind: "earlier", count: 3 }), "earlier:");
  assert.equal(rowKey(undefined), null);
});
