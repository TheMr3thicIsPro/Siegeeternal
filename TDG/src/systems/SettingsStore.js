// ============================================================
// SettingsStore — persisted player preferences
// Singleton. Import { settingsStore } wherever needed.
// Saved to localStorage under 'siege_eternal_settings'.
// ============================================================

const STORAGE_KEY = 'siege_eternal_settings';

const DEFAULTS = {
  cursorSensitivity: 1.0,   // gamepad right-stick cursor speed multiplier (0.5–3)
  screenShake:       true,   // camera shake enabled
  sfxVolume:         0.75,   // master SFX volume (0–1)
  particles:         'full', // 'full' | 'reduced'
};

class SettingsStore {
  constructor() {
    this._data = { ...DEFAULTS };
    this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this._data = { ...DEFAULTS, ...parsed };
      }
    } catch (_) {}
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch (_) {}
  }

  get cursorSensitivity() { return this._data.cursorSensitivity; }
  set cursorSensitivity(v) { this._data.cursorSensitivity = v; }

  get screenShake()       { return this._data.screenShake; }
  set screenShake(v)      { this._data.screenShake = v; }

  get sfxVolume()         { return this._data.sfxVolume; }
  set sfxVolume(v)        { this._data.sfxVolume = v; }

  get particles()         { return this._data.particles; }
  set particles(v)        { this._data.particles = v; }
}

export const settingsStore = new SettingsStore();
