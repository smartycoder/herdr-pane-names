# Pane names

Name any terminal pane ("api server", "db migrations") and find it again. The name replaces the program
name in the pane header ("Claude Code", "zsh"), and Go To lists every named pane under its tab, searchable,
with Enter jumping straight to that pane, also in another tab or space.

![Pane names](preview.png)

## What you see

- **Pane header** (`pane-named`): the same 30 px header as Herdr's `pane` mod (program icon, name, folder,
  agent status, hover buttons), but the name slot shows the pane's name when it has one.
- **Rename dialog** (`pane-rename`): a 420 × 200 px dialog titled "Rename pane", one "Name" field prefilled
  with the current name and selected, the hint "Empty name removes it", Cancel and Save buttons, "Esc" in the
  top right. Same look as Herdr's `prompt` dialog (theme colors `popover`, `accent`, `solid`).
- **Go To** (`picker-named`): Herdr's Go To popup (640 px wide, top, offset 40) with one more row kind: under
  each tab, every named pane as a 28 px row `↳ <name>`, indented 32 px, with the program name dimmed on the
  right. Placeholder: "Go to a tab, pane, space or agent…".

## How it behaves

- The name lives on the terminal as the herdr-core label `pane.name`. Any Herdr window and the CLI see it
  (`hc get t3`), an agent can set its own (`hc label t3 pane.name="api server"`), and it ends with the
  terminal.
- `cmd-f2` opens the dialog for the focused pane; double-clicking the name in a pane header opens it for that
  pane. Enter or Save writes the trimmed name, an empty name removes the label, an unchanged name just closes,
  Esc or Cancel closes without writing. A failed write shows an error toast "Rename failed".
- A mod pane (Files, Changes) has no terminal: `cmd-f2` there shows the warning toast "This pane has no
  terminal" and no dialog.
- Go To with an empty filter shows every named pane under its tab. With a filter, a tab matches on its space
  name, tab name, agent programs and its terminals' titles (e.g. a Claude Code session title); a named pane
  shows when its name matches or its tab matches. The selection goes to the first row that matches by itself,
  and a named pane under a matching tab wins over the tab. Enter or click on a pane row runs `tab.select`,
  then `pane.focus`. `ctrl+d` closes a tab row as before and does nothing on a pane row.
- Agent statuses (working, blocked, done, idle) look exactly as in Herdr's `pane` and `picker`.

## Built from

- `mods/pane-rename`: new. `mod.json` overlay `{ "kind": "dialog", "width": 420, "height": 200 }`. Target is
  `props().terminal`, else `focused().terminal` read once in `init`. Writes with
  `hc(["label", terminal, "pane.name=" + name])`.
- `mods/pane-named`: `mod.clone pane`, name slot `label || <Herdr's name>` where the label is
  `terminals().find((t) => t.address === pane.terminal)?.labels?.["pane.name"]`; the name `div` has
  `on_mouse_down("left")` with `click_count === 2` → `openOverlay({ mod: "pane-rename", kind: "dialog",
  width: 420, height: 200, props: { terminal } })`.
- `mods/picker-named`: `mod.clone picker` plus `names.js` (pure, no Herdr import): `tabMatch(...)` decides a
  tab's own match and its named pane rows, `firstPick(rows)` the selected row. `node --test names.test.mjs`
  covers both.
- Hook-up, outside the mods:
  - `keys.json`: `cmd-k` → `mod.open:picker-named`, `cmd-f2` → `mod.open:pane-rename`.
  - Each layout that should show names in pane headers: its tab block's `pane.header.content.mod` →
    `"pane-named"`. Herdr's own layouts are read-only: `layout.clone` first and edit the clone.
- Commands used: `tab.select`, `pane.focus`. Program run: `hc label`.

## Watch out

- Every `mod.json` must keep `"place": "none"`, or Herdr docks the mod into the shown layout on first sight.
- A mod cannot change a layout, so without the header hook-up names show only in Go To.
- `pane-named` and `picker-named` are clones of Herdr 0.1.15's mods and don't get Herdr's later fixes;
  compare with the shipped `pane` and `picker` after an upgrade.
- Keys are macOS (`cmd`); on Linux and Windows pick free `ctrl-shift` keys instead.
- The label key is `pane.name`; never write `herdr.*` labels.
- Names on remote machines' terminals are untested (`machine/t7` addresses).

## Done when

1. `herdr-app check` passes for all three mods and `node --test names.test.mjs` is green.
2. `cmd-f2` on a terminal pane, type "api server", Enter: `hc get <t>` shows `pane.name: api server` and the
   pane header shows it.
3. Double-click the name, clear it, Save: the label is gone and the header shows the program name again.
4. From another tab, `cmd-k`, type "api": the `↳ api server` row is selected; Enter focuses that pane.
5. `cmd-f2` on a Files pane: warning toast, no dialog.
