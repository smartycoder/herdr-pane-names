// Names a pane: writes the label pane.name on its core terminal (`hc label <t> pane.name=<name>`),
// read by the pane-named header and the picker-named Go To. Opened by mod.open (cmd-F2: the focused
// pane) or by the header with props { terminal }. Enter saves, an empty name removes it, Esc cancels.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { props, focused, terminals, hc, notify, closeOverlay, theme } from "herdr";

const LABEL = "pane.name";

export default class PaneRename extends View {
  init(_props, cx) {
    // Read once: once this dialog is up, focus is no longer the pane being renamed.
    this.target = props()?.terminal ?? focused()?.terminal ?? null;
    if (!this.target) {
      notify({ level: "warning", title: "This pane has no terminal" });
      this.close();
      return;
    }
    this.before = terminals().find((t) => t.address === this.target)?.labels?.[LABEL] ?? "";
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

  submit(cx) {
    const name = this.input.value().trim();
    if (name === this.before) return this.close();
    // One write at a time: Enter and Save while hc is still running would label twice.
    if (this.busy) return;
    this.busy = true;
    // Close only after the write: closing cancels this copy's tasks.
    cx.spawn(async () => {
      try {
        const r = await hc(["label", this.target, `${LABEL}=${name}`]);
        if (r.code !== 0) notify({ level: "error", title: "Rename failed", body: (r.stderr || r.stdout).trim().split("\n")[0] });
      } catch (e) {
        notify({ level: "error", title: "Rename failed", body: String(e?.message ?? e) });
      }
      this.close();
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
      .on_key_down((e, cx) => { if (e.key === "escape") { this.close(); cx.stop_propagation(); } })
      .w_full().min_h(0).p(18).bg(t.popover).text_color(t.foreground)
      .child(h_flex().items_center().child(div().flex_1().text_size(15).font_semibold().child("Rename pane"))
        .child(div().text_size(11).text_color(t.dim).child("Esc")))
      .child(div().pt(16).pb(7).text_size(11.5).text_color(t.dim).child("Name"))
      .child(Input.new(this.input).h(36).px(10).rounded(9).border_1().border_color(this.inputFocused ? t.accent : t.input).bg(t.background).text_size(12.8).text_color(t.foreground))
      .child(div().pt(6).text_size(11.5).text_color(t.dim).child("Empty name removes it"))
      .child(h_flex().pt(16).gap(8).justify_end()
        .child(button("pr-cancel", "Cancel", false, () => this.close()))
        .child(button("pr-save", "Save", true, (_e, cx) => this.submit(cx))));
  }
}
