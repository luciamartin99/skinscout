const STORAGE_KEY = "skinscout_profile";

export function saveSkinProfile(profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function loadSkinProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSkinProfile() {
  localStorage.removeItem(STORAGE_KEY);
}
