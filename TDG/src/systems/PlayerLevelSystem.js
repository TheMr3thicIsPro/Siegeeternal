// ============================================================
// PlayerLevelSystem — XP from kills, auto-apply level bonus
// ============================================================
export class PlayerLevelSystem {
  constructor(scene) {
    this.scene    = scene;
    this.level    = 1;
    this.xp       = 0;
    this.xpToNext = 100;
  }

  /** Call after every enemy kill. enemy.def needed for xp value. */
  addXP(enemy) {
    const base = enemy?.def?.boss ? 50 : (enemy?.def?.dungeon ? 15 : 8);
    this.xp += base;
    this.scene.events.emit('xp_gained', this.xp, this.xpToNext);
    if (this.xp >= this.xpToNext) this._levelUp();
  }

  _levelUp() {
    this.xp -= this.xpToNext;
    this.level++;
    this.xpToNext = Math.floor(this.xpToNext * 1.4);
    this.scene.events.emit('player_level_up', this.level);
    // Auto-apply: +10 max HP, heal 10
    const s = this.scene;
    s.playerMaxHP = (s.playerMaxHP ?? 100) + 10;
    s.playerHP    = Math.min((s.playerHP ?? 100) + 10, s.playerMaxHP);
    s.hud?.showMsg(`Level ${this.level}! +10 Max HP`, 2500);
  }

  serialize() {
    return { level: this.level, xp: this.xp, xpToNext: this.xpToNext };
  }

  restore(data) {
    if (!data) return;
    this.level    = data.level    ?? 1;
    this.xp       = data.xp       ?? 0;
    this.xpToNext = data.xpToNext ?? 100;
  }
}
