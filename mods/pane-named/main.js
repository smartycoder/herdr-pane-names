// Modified from Herdr's shipped `pane` mod (Herdr 0.1.15, Apache-2.0): adds pane names (pane.name label).
// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "pane-named" } } } }
// Shows the program's icon (the app's program table), the pane's name (the pane.name label
// on its terminal, set by the pane-rename mod) or else the agent's name or the terminal's
// title, the folder, and the agent's status; buttons split, zoom and close this pane.
// A zoomed pane's header is tinted with the accent, says "Zoomed · N hidden" and keeps its unzoom button shown.
// A Claude Code pane keeps its name and the session's name the same (sync.js): a new pane name is typed
// into Claude as /rename, and a name given in Claude (/rename) becomes the pane name.
// Props from the app: { pane, terminal }. Click: focus the pane. Double-click the name: rename.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home, layout, terminals, openOverlay, hc, readTextFile, notify } from "herdr";
import { zoomBadge } from "./zoom.js";
import { userName, renameText, pullLabel } from "./sync.js";

const LABEL = "pane.name";

// Match the first visible tab frame, including the active child of a stack.
function paneFrame(node) {
  if (!node || node.hidden) return null;
  if (node.content?.tab && node.content.pane) return node.content.pane;
  let children = node.children ?? [];
  if (node.type === "stack") {
    const visible = children.filter(child => !child.hidden);
    children = [visible.find(child => child.id === node.active) ?? visible[0]];
  }
  for (const child of children) {
    const frame = paneFrame(child);
    if (frame) return frame;
  }
  return null;
}

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

/** A terminal's pane name, trimmed: a label of only spaces (set by hand or by an agent) counts as none. */
function labelOf(address) {
  return String(terminals().find((x) => x.address === address)?.labels?.[LABEL] ?? "").trim();
}

/** The Claude Code session in a terminal on this computer: { name } (null when the person never named it),
 *  or null when none runs there. Its foreground process is Claude, registered as ~/.claude/sessions/<pid>.json. */
async function sessionOf(address) {
  let info = null;
  try { info = JSON.parse((await hc(["get", address, "--json"]))?.stdout ?? ""); } catch { return null; }
  const pid = info?.foreground?.pid;
  if (!Number.isInteger(pid)) return null;
  let text = null;
  try { text = await readTextFile(`${home()}/.claude/sessions/${pid}.json`); } catch { return null; }
  return text == null ? null : { name: userName(text) };
}

export default class Pane extends View {
  init(given, cx) {
    this.hovered = false;
    // Read once: props() in a later callback can answer for another copy.
    this.paneId = given?.pane ?? props()?.pane;
    this.seen = null;
    this.syncing = false;
    cx.timer.every(1000, (cx) => this.tick(cx));
  }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  /** What the name sync compares for this pane, or null when it does not apply (not Claude Code, or on
   *  another machine: its session registry is there). */
  watched() {
    const p = panes().find((x) => x.pane === this.paneId);
    if (!p?.terminal || p.terminal.includes("/")) return null;
    if (p.app !== "claude-code" && terminals().find((x) => x.address === p.terminal)?.agent !== "claude-code") return null;
    return { terminal: p.terminal, label: labelOf(p.terminal), title: String(p.title ?? "") };
  }

  // Syncs on a change only, never on first sight: a pane and a session that already differ stay as they are
  // until one of them is renamed. A new pane name is pushed; a new terminal title (Claude sets it to the
  // session's name on /rename) pulls the session's name. One sync at a time; changes meanwhile wait.
  tick(cx) {
    if (this.syncing) return;
    const now = this.watched();
    const was = this.seen;
    this.seen = now;
    if (!now || !was || was.terminal !== now.terminal) return;
    const kind = now.label !== was.label ? "push" : now.title !== was.title ? "pull" : null;
    if (!kind) return;
    this.syncing = true;
    cx.spawn(async (cx) => {
      try { await this.sync(kind, now.terminal, cx); } catch {}
      this.syncing = false;
    });
  }

  async sync(kind, terminal, cx) {
    const session = await sessionOf(terminal);
    if (!session) return;
    const label = labelOf(terminal);
    if (kind === "pull") {
      const next = pullLabel(label, session.name);
      if (next) await hc(["label", terminal, `${LABEL}=${next}`]);
      return;
    }
    const text = renameText(label, session.name);
    if (!text) return;
    // hc send waits while the person has an unfinished prompt in Claude, then types /rename (an immediate
    // command: it runs even while Claude works). Run from the app, not from a terminal, so it is not wrapped
    // as a message from another terminal.
    const send = hc(["send", terminal, text]);
    if (await Promise.race([send.then(() => false), cx.sleep(3000).then(() => true)])) {
      notify({ level: "info", title: "Claude session renames after your prompt", body: "Send or clear what you typed in Claude." });
    }
    const r = await send;
    if (r.code !== 0) {
      notify({ level: "warning", title: "Claude session not renamed", body: (r.stderr || r.stdout).trim().split("\n")[0] });
    }
  }

  button(t, id, icon, command, args, color = t.dim) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(color)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/pane-named/${icon}.svg`).size(14));
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const label = p.terminal ? labelOf(p.terminal) : "";
    const name = label || ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    const bottom = paneFrame(layout())?.header?.position === "bottom";
    // Zoomed: accent tint, a 2 px accent line on the terminal-facing edge, the badge and a shown unzoom button.
    const badge = zoomBadge(panes(), pane);
    const edge = badge ? 2 : 1;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .bg(badge ? t.accent + "38" : t.background)
      .when(bottom, el => el.border_t(edge))
      .when(!bottom, el => el.border_b(edge))
      .border_color(badge ? t.accent : t.border)
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().id(`ph-name-${pane}`).flex_none().truncate().max_w(260).font_medium().text_color(t.foreground)
        .on_mouse_down("left", (e, cx) => {
          if (e.click_count !== 2 || !p.terminal) return;
          cx.stop_propagation();
          openOverlay({ mod: "pane-rename", kind: "dialog", width: 420, height: 200, modal: true, props: { terminal: p.terminal } });
        })
        .child(name))
      .child(div().flex_1().truncate().text_color(badge ? t.foreground + "c0" : t.dim).child(folder(p.cwd)))
      .when(st === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", el => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(Boolean(badge), el => el
        .child(div().flex_none().px(6).h(18).flex().items_center().gap(4).rounded(5).bg(t.accent)
          .text_size(10.5).font_semibold().text_color(t.accent_foreground)
          .child(svg("mods/pane-named/zoom.svg").size(11).flex_none().text_color(t.accent_foreground))
          .child(badge))
        .child(this.button(t, `ph-uz-${pane}`, "unzoom", "pane.zoom", { pane }, t.foreground)))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        // A zoomed pane already shows its unzoom button next to the badge.
        .when(!badge, el => el.child(this.button(t, `ph-z-${pane}`, "zoom", "pane.zoom", { pane })))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
