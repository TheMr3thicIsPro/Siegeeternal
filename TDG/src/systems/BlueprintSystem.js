// ============================================================
// BlueprintSystem — permanent blueprint unlocks across all runs
// Stored in a separate meta localStorage key so they survive
// save-slot deletion (permadeath wipes the run, not the meta).
// ============================================================
import { BLUEPRINT_DEFS } from '../constants.js';

const META_KEY = 'siege_eternal_meta';

class BlueprintSystem {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const raw  = localStorage.getItem(META_KEY);
      const data = raw ? JSON.parse(raw) : {};
      this._unlocked = new Set(data.blueprints ?? []);
    } catch (_) {
      this._unlocked = new Set();
    }
  }

  _save() {
    try {
      const raw  = localStorage.getItem(META_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.blueprints = [...this._unlocked];
      localStorage.setItem(META_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  has(key) { return this._unlocked.has(key); }

  /** Check if a perk blueprint is owned (pass the perkId, e.g. 'lucky_crit') */
  hasPerkBlueprint(perkId) { return this._unlocked.has('perk_' + perkId); }

  /** Unlock a blueprint by key. Returns the def name if newly unlocked, null otherwise. */
  unlock(key) {
    if (!BLUEPRINT_DEFS[key]) return null;
    if (this._unlocked.has(key)) return null;
    this._unlocked.add(key);
    this._save();
    return BLUEPRINT_DEFS[key].name;
  }

  /** All unlocked blueprint keys */
  all() { return [...this._unlocked]; }

  /** All tower blueprint keys that are NOT yet unlocked */
  lockedTower() {
    return Object.keys(BLUEPRINT_DEFS).filter(k => BLUEPRINT_DEFS[k].type === 'tower' && !this._unlocked.has(k));
  }

  /** All perk blueprint keys that are NOT yet unlocked */
  lockedPerk() {
    return Object.keys(BLUEPRINT_DEFS).filter(k => BLUEPRINT_DEFS[k].type === 'perk' && !this._unlocked.has(k));
  }

  /** Give a random locked tower blueprint (never bridge — it's per-run only) */
  unlockRandomTower() {
    const candidates = this.lockedTower().filter(k => !BLUEPRINT_DEFS[k]?.perRun);
    if (!candidates.length) return null;
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    return this.unlock(key);
  }

  /** Give a random locked perk blueprint */
  unlockRandomPerk() {
    const candidates = this.lockedPerk();
    if (!candidates.length) return null;
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    return this.unlock(key);
  }

  /** Give a random locked blueprint of any type (never per-run blueprints) */
  unlockRandom() {
    const candidates = Object.keys(BLUEPRINT_DEFS).filter(k => !this._unlocked.has(k) && !BLUEPRINT_DEFS[k]?.perRun);
    if (!candidates.length) return null;
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    return this.unlock(key);
  }
}

export const blueprintSys = new BlueprintSystem();
