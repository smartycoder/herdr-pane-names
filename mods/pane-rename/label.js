// Pane-name rules for the rename dialog. Pure (no Herdr runtime), so label.test.mjs runs it under node.

export const LABEL = "pane.name";

// A terminal's pane name: the trimmed label, "" when unnamed (missing, empty or only spaces).
export function readLabel(terminals, address) {
  if (!address) return "";
  return String(terminals.find((t) => t.address === address)?.labels?.[LABEL] ?? "").trim();
}

// What Save writes for the typed text, given the current (trimmed) name: null = nothing to write,
// "" = remove the name, otherwise the trimmed new name.
export function nextLabel(raw, before) {
  const name = String(raw ?? "").trim();
  return name === before ? null : name;
}
