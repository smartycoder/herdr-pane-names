// Names a pane: writes the label pane.name on its core terminal (`hc label <t> pane.name=<name>`),
// read by the pane-named header and the picker-named Go To. Opened by mod.open (cmd-F2: the focused
// pane) or by the header with props { terminal }. Enter saves, an empty name removes it, Esc cancels.
// A failed save keeps the dialog open; while a save runs, Esc and Cancel wait for it.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, focused, terminals, hc, notify, closeOverlay, theme, layout } from "herdr";
import { LABEL, readLabel, nextLabel } from "./label.js";

export default class PaneRename extends View {
  init(_props, cx) {
    // Read once: once this dialog is up, focus is no longer the pane being renamed.
    this.target = props()?.terminal ?? focused()?.terminal ?? null;
    if (!this.target) {
      notify({ level: "warning", title: "This pane has no terminal" });
      this.close();
      return;
    }
    this.before = readLabel(terminals(), this.target);
    // The pane-named header renames the Claude session too (its sync), so say so only where it shows.
    this.claude = !this.target.includes("/")
      && terminals().find((x) => x.address === this.target)?.agent === "claude-code"
      && JSON.stringify(layout() ?? {}).includes('"mod":"pane-named"');
    this.input = InputState.new({ value: this.before });
    if (this.before) this.input.set_selected_range({ start: 0, end: this.before.length });
    this.input.on("submit", (_e, cx) => this.submit(cx));
    this.inputFocused = true;
    this.input.on("focus", (_e, cx) => { this.inputFocused = true; cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.inputFocused = false; cx.notify(); });
    this.input.focus();
    cx.timer.after(600, () => this.input.focus());
    this.handle = cx.focus_handle();
  }

  close() {
    // props() is null outside an overlay (herdr-app check).
    const overlay = props()?.overlay;
    if (overlay) closeOverlay(overlay);
  }

  cancel() {
    // Closing cancels this copy's tasks, so a running save is not interrupted from here.
    if (!this.busy) this.close();
  }

  submit(cx) {
    // One write at a time: Enter and Save while hc is still running would label twice.
    if (this.busy) return;
    const name = nextLabel(this.input.value(), this.before);
    if (name === null) return this.close();
    this.busy = true;
    cx.spawn(async (cx) => {
      let error = null;
      try {
        const r = await hc(["label", this.target, `${LABEL}=${name}`]);
        if (r.code !== 0) error = (r.stderr || r.stdout).trim().split("\n")[0];
      } catch (e) {
        error = String(e?.message ?? e);
      }
      if (!error) return this.close();
      // Keep the dialog and the typed name so the person can retry or cancel.
      notify({ level: "error", title: "Rename failed", body: error });
      this.busy = false;
      this.input.focus();
      cx.notify();
    });
  }

  render() {
    const t = theme();
    if (!this.target) return div();
    const button = (id, text, primary, action) => h_flex().id(id).h(32).px(14).items_center().rounded(8)
      .border_1().border_color(primary ? t.solid : t.input).bg(primary ? t.solid : t.raised)
      .text_color(primary ? t.solid_foreground : t.foreground).text_size(12.5).font_medium().cursor_pointer()
      .hover((s) => s.opacity(0.88)).on_click(action).child(text);
    return v_flex().id("pane-rename").track_focus(this.handle)
      .on_key_down((e, cx) => { if (e.key === "escape") { this.cancel(); cx.stop_propagation(); } })
      .w_full().min_h(0).p(18).bg(t.popover).text_color(t.foreground)
      .child(h_flex().items_center().child(div().flex_1().text_size(15).font_semibold().child("Rename pane"))
        .child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(div().pt(16).pb(7).text_size(11.5).text_color(t.dim).child("Name"))
      .child(Input.new(this.input).h(36).px(10).rounded(9).border_1().border_color(this.inputFocused ? t.accent : t.input).bg(t.background).text_size(12.8).text_color(t.foreground))
      .child(div().pt(6).text_size(11.5).text_color(t.dim).child(this.claude ? "Renames the Claude session too · empty removes the name" : "Empty name removes it"))
      .child(h_flex().pt(16).gap(8).justify_end()
        .child(button("pr-cancel", "Cancel", false, () => this.cancel()))
        .child(button("pr-save", "Save", true, (_e, cx) => this.submit(cx))));
  }
}
