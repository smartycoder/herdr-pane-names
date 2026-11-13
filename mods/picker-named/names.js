// Pane names for Go To. Pure (no Herdr runtime), so names.test.mjs runs it under node.
// A pane's name is the pane.name label on its core terminal (written by the pane-rename mod).

const LABEL = "pane.name";

// f is already lower-case; an empty filter matches everything.
export function matches(text, f) {
  return !f || String(text ?? "").toLowerCase().includes(f);
}

// For one tab: whether its own text (space, tab, agent programs, terminal titles) matches,
// and the named panes to show under it, in panes() order, each with its own hit.
export function tabMatch({ space, tab, programs, panes, terminals, filter }) {
  const mine = panes.filter((p) => p.tab === tab.id);
  // Titles of terminals only: a mod pane's title is just its mod's name.
  const titles = mine.filter((p) => p.terminal).map((p) => p.title ?? "");
  const hit = matches([space, tab.name, ...programs, ...titles].join(" "), filter);
  const named = mine
    .map((p) => ({
      pane: p.pane,
      // Trimmed: a label of only spaces (set with hc label by hand or an agent) counts as no name.
      name: p.terminal ? String(terminals.find((t) => t.address === p.terminal)?.labels?.[LABEL] ?? "").trim() : "",
      program: p.program?.name ?? "",
    }))
    .filter((p) => p.name)
    .map((p) => ({ ...p, hit: !filter || matches(p.name, filter) }));
  return { hit, panes: hit ? named : named.filter((p) => p.hit) };
}

// Row to select while filtering (rows without heads, as main.js shows them): the first row that
// matches by itself; when that is a tab row, its own matching pane right under it wins, since a
// named pane is more specific than the tab its title or name also matched. No match: row 0.
export function firstPick(rows) {
  const i = rows.findIndex((r) => r.hit);
  if (i < 0) return 0;
  if (rows[i].kind !== "ctx") return i;
  for (let k = i + 1; k < rows.length && rows[k].kind === "pane" && rows[k].ctx.id === rows[i].ctx.id; k++) {
    if (rows[k].hit) return k;
  }
  return i;
}

// A row's identity across rebuilds (titles and statuses reorder rows while Go To is open),
// so the selection follows the row, not its index. null for no row.
export function rowKey(r) {
  if (!r) return null;
  if (r.kind === "ctx") return `ctx:${r.ctx.id}`;
  if (r.kind === "pane") return `pane:${r.pane}`;
  return `${r.kind}:${r.machine ?? ""}`;
}
