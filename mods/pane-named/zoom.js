// The header badge of a zoomed pane. Pure (no Herdr import), so a plain Node test can run it.

/** "Zoomed · N hidden" (N: the other panes of its tab, which the zoom hides), or "Zoomed" when it is alone.
 *  null when the pane is not zoomed or not in `panes` (the `panes()` list of the herdr module). */
export function zoomBadge(panes, pane) {
  const me = panes.find((p) => p.pane === pane);
  if (!me?.zoomed) return null;
  const hidden = panes.filter((p) => p.tab === me.tab && p.pane !== pane).length;
  return hidden ? `Zoomed · ${hidden} hidden` : "Zoomed";
}
