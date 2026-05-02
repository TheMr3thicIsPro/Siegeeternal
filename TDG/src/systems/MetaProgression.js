// ============================================================
// MetaProgression — souls earned on death, spent to unlock perks
// Persists in localStorage independently of run save slots.
// ============================================================
import { META_PERK_COSTS, FREE_PERKS } from '../constants.js';

const META_KEY = 'siege_eternal_meta';

class MetaProgression {
  constructor() {
    this._load();
  }

  _load() {
    try {
      const raw  = localStorage.getItem(META_KEY);
      const data = raw ? JSON.parse(raw) : {};
      this._soulsEarned  = data.soulsEarned  ?? 0;
      this._soulsSpent   = data.soulsSpent   ?? 0;
      this._unlockedPerks = new Set(data.unlockedPerks ?? [...FREE_PERKS]);
    } catch (_) {
      this._soulsEarned   = 0;
      this._soulsSpent    = 0;
      this._unlockedPerks = new Set([...FREE_PERKS]);
    }
    // Always ensure free perks are present
    for (const p of FREE_PERKS) this._unlockedPerks.add(p);
  }

  _save() {
    try {
      const raw  = localStorage.getItem(META_KEY);
      const data = raw ? JSON.parse(raw) : {};
      data.soulsEarned   = this._soulsEarned;
      data.soulsSpent    = this._soulsSpent;
      data.unlockedPerks = [...this._unlockedPerks];
      localStorage.setItem(META_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  get balance() { return this._soulsEarned - this._soulsSpent; }
  get earned()  { return this._soulsEarned; }
  get spent()   { return this._soulsSpent; }

  /** Called when a run ends — soul count from that run added to meta pool. */
  addSoulsFromRun(soulsCount) {
    if (soulsCount <= 0) return;
    this._soulsEarned += soulsCount;
    this._save();
  }

  hasPerk(perkId) { return this._unlockedPerks.has(perkId); }

  allUnlocked() { return [...this._unlockedPerks]; }

  costFor(perkId) { return META_PERK_COSTS[perkId] ?? 999; }

  /** Attempt to spend meta souls to unlock a perk. Returns true on success. */
  unlockPerk(perkId) {
    if (this._unlockedPerks.has(perkId)) return false;
    const cost = this.costFor(perkId);
    if (this.balance < cost) return false;
    this._soulsSpent += cost;
    this._unlockedPerks.add(perkId);
    this._save();
    return true;
  }

  allPerkCosts() { return META_PERK_COSTS; }
}

export const metaProgression = new MetaProgression();
