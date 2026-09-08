// Distinguishes a real Supabase product id (uuid) from a legacy mock
// catalog id ("p1".."p12", src/data/products.js) — used wherever compareIds
// or a routine/candidate id needs to be routed to the right data source.
// Pure, dependency-free — safe to import from both client and server code.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRealProductId(id) {
  return typeof id === "string" && UUID_RE.test(id);
}
