// Keeps a Claude Code pane's name and its session name the same. Pure (no Herdr import), so a plain
// Node test can run it; main.js reads the session registry and runs hc.
//
// Claude Code keeps a registry entry per live session in ~/.claude/sessions/<pid>.json with `name` and
// `nameSource`: "user" when the person named it (`/rename`, `--name`), "derived" or "auto" otherwise.

/** One line: every run of whitespace (newlines too) becomes one space, trimmed. */
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** The name the person gave the session, from the registry file's text; null when the name is derived or
 *  automatic, empty, or the text is missing or not JSON. */
export function userName(registryText) {
  if (registryText == null) return null;
  let entry = null;
  try { entry = JSON.parse(registryText); } catch { return null; }
  if (entry?.nameSource !== "user") return null;
  return oneLine(entry.name) || null;
}

/** What to type into Claude after the pane's name changed: "/rename <name>", or null when the pane has no
 *  name (removing a pane name leaves the session alone) or the session already has it. */
export function renameText(label, sessionName) {
  const name = oneLine(label);
  return name && name !== sessionName ? `/rename ${name}` : null;
}

/** The pane's new name after the session's name changed, or null when the session has no name the person
 *  gave it or the pane already has it. */
export function pullLabel(label, sessionName) {
  return sessionName && sessionName !== oneLine(label) ? sessionName : null;
}
