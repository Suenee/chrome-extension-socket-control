const KEY = "runtime_log";
const MAX = 300;
export async function log(level, area, message, details = undefined) {
  const row = { timestamp: new Date().toISOString(), level, area, message };
  if (details !== undefined) row.details = sanitize(details);
  try {
    const data = await chrome.storage.local.get(KEY);
    const rows = Array.isArray(data[KEY]) ? data[KEY] : [];
    rows.push(row);
    if (rows.length > MAX) rows.splice(0, rows.length - MAX);
    await chrome.storage.local.set({ [KEY]: rows });
  } catch (_) {}
}
export async function clearRuntimeLog() { await chrome.storage.local.set({ [KEY]: [] }); }
function sanitize(value) {
  if (typeof value === "string") return value.length > 2000 ? value.slice(0, 2000) + "…" : value;
  try { return JSON.parse(JSON.stringify(value, (k, v) => /apikey/i.test(k) ? "[redacted]" : v)); }
  catch { return String(value); }
}
