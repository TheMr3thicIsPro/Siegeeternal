// ============================================================
// RelicSystem — run-specific relics (found, not chosen)
// Passive effects that change gameplay significantly.
// ============================================================
import { RELIC_DEFS } from '../constants.js';

export class RelicSystem {
  constructor(scene) {
    this.scene   = scene;
    this.relics  = [];   // active relic keys this run
    this._panel  = null;
    this._slowTimer = 0;
  }

  /** Collect a relic. Returns false if already held. */
  collect(key) {
    if (this.relics.includes(key)) return false;
    this.relics.push(key);
    this._applyPassive(key);
    this._buildPanel();
    return true;
  }

  _applyPassive(key) {
    const s = this.scene;
    if (key === 'greed_idol') {
      s.playerMaxHP = Math.max(20, (s.playerMaxHP ?? 100) - 20);
      s.playerHP    = Math.min(s.playerHP ?? 100, s.playerMaxHP);
    }
  }

  has(key) { return this.relics.includes(key); }

  /** Called by EnemyManager after a kill — apply on-kill relic effects. */
  onKill(enemy) {
    const s = this.scene;
    if (this.has('blood_core')) {
      s.playerHP = Math.max(1, (s.playerHP ?? 1) - 1);
    }
    if (this.has('soul_engine')) {
      s.playerMP = Math.min(s.playerMaxMP ?? 100, (s.playerMP ?? 0) + 1);
    }
  }

  /** Called by EnemyManager — greed_idol gives 2× drops */
  dropMult() { return this.has('greed_idol') ? 2 : 1; }

  /** Called per-frame — time_breaker random slow bursts */
  update(delta) {
    if (!this.has('time_breaker')) return;
    this._slowTimer += delta;
    if (this._slowTimer < 8000) return;
    this._slowTimer = 0;
    // Emit a slow pulse around the player
    const s = this.scene;
    const r = 200;
    for (const e of (s.enemyMgr?.enemies ?? [])) {
      if (!e.alive) continue;
      const d = Math.hypot(e.sprite.x - s.player.x, e.sprite.y - s.player.y);
      if (d < r) {
        e.slow      = 0.2;
        e.slowTimer = 3000;
        if (e.sprite?.active) e.sprite.setTint(0x88FFDD);
        s.time.delayedCall(3000, () => { if (e.sprite?.active) e.sprite.clearTint(); });
      }
    }
    s.enemyMgr?.spawnParticles(s.player.x, s.player.y, 0x44FFAA, 20);
  }

  /** Called in GameScene before blood_core shots */
  dmgMult() { return this.has('blood_core') ? 1.5 : 1.0; }

  // ── Relic HUD panel (bottom-right corner) ──────────────

  _buildPanel() {
    this._destroyPanel();
    const s     = this.scene;
    const baseX = 900;
    const baseY = 560;
    this._panel = [];

    this.relics.forEach((key, i) => {
      const def = RELIC_DEFS[key];
      if (!def) return;
      const x = baseX - i * 36;
      const icon = s.add.circle(x, baseY, 14, def.color, 0.85)
        .setScrollFactor(0).setDepth(50).setInteractive();
      const label = s.add.text(x, baseY - 20, def.name, {
        fontSize: '8px', color: '#FFFFFF', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
        backgroundColor: '#000000CC', padding: { x: 3, y: 2 },
      }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(51).setVisible(false);

      icon.on('pointerover', () => label.setVisible(true));
      icon.on('pointerout',  () => label.setVisible(false));

      const letter = s.add.text(x, baseY, def.name[0], {
        fontSize: '11px', color: '#FFFFFF', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(52);

      this._panel.push(icon, label, letter);
    });
  }

  _destroyPanel() {
    if (this._panel) { this._panel.forEach(o => o?.destroy()); this._panel = null; }
  }

  serialize()         { return { relics: [...this.relics] }; }
  restore(data)       {
    (data?.relics ?? []).forEach(k => this.collect(k));
  }
}
