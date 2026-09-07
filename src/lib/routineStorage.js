// Same pattern as src/lib/skinProfile.js — stores the last generated
// routine (plus the candidate details needed to render it) client-side so
// the Routine page can be revisited/reloaded without calling Claude again.
const STORAGE_KEY = "skinscout_routine";

export function saveRoutine(routine) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routine));
}

export function loadRoutine() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearRoutine() {
  localStorage.removeItem(STORAGE_KEY);
}
