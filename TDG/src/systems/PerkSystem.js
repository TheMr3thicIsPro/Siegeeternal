// ============================================================
// PerkSystem — Siege Eternal
// Manages all 22 perks: passive effects, active abilities,
// the pick overlay, serialization, and per-frame updates.
// ============================================================
import { VW, VH, FREE_PERKS } from '../constants.js';
import { blueprintSys } from './BlueprintSystem.js';

// ── Perk definitions ────────────────────────────────────────
export const PERK_DEFS = [
  // COMBAT
  {
    id: 'lifesteal',
    cat: 'COMBAT',
    name: 'Lifesteal',
    desc: 'Restore 2 HP every time you kill an enemy.',
    color: 0xCC2244,
  },
  {
    id: 'lucky_crit',
    cat: 'COMBAT',
    name: 'Lucky Crit',
    desc: '15% chance to deal triple damage on each hit.',
    color: 0xFFCC00,
  },
  {
    id: 'headhunter',
    cat: 'COMBAT',
    name: 'Headhunter',
    desc: '10% chance to instantly kill non-boss enemies.',
    color: 0xFF6600,
  },
  {
    id: 'burning_aura',
    cat: 'COMBAT',
    name: 'Burning Aura',
    desc: 'A 40px fire aura deals 3 damage per second to nearby enemies.',
    color: 0xFF4400,
  },
  // TOWER
  {
    id: 'sniper',
    cat: 'TOWER',
    name: 'Sniper',
    desc: 'All towers gain +40% attack range.',
    color: 0x44AAFF,
  },
  {
    id: 'overclock',
    cat: 'TOWER',
    name: 'Overclock',
    desc: 'All towers fire 35% faster but lose 1 HP every 5 shots.',
    color: 0x00FFCC,
  },
  {
    id: 'double_shot',
    cat: 'TOWER',
    name: 'Double Shot',
    desc: '25% chance for any tower to fire twice per attack.',
    color: 0xAAFF44,
  },
  {
    id: 'chain_lightning',
    cat: 'TOWER',
    name: 'Chain Lightning',
    desc: 'Volt Spire lightning chains to 8 targets instead of 3.',
    color: 0xCCCCFF,
  },
  {
    id: 'freeze_mastery',
    cat: 'TOWER',
    name: 'Freeze Mastery',
    desc: 'Frost Spire slow multiplier drops from 0.45 to 0.2.',
    color: 0x88DDFF,
  },
  {
    id: 'explosive_shots',
    cat: 'TOWER',
    name: 'Explosive Shots',
    desc: 'Tower projectile hits create a 40px AoE splash.',
    color: 0xFF8800,
  },
  // ECONOMY
  {
    id: 'greed',
    cat: 'ECONOMY',
    name: 'Greed',
    desc: 'All resource drops are doubled.',
    color: 0xFFDD44,
  },
  {
    id: 'scavenger',
    cat: 'ECONOMY',
    name: 'Scavenger',
    desc: '30% chance to receive a random resource (wood/stone/bone/coal) on each kill.',
    color: 0xBBAA66,
  },
  {
    id: 'auto_repair',
    cat: 'ECONOMY',
    name: 'Auto Repair',
    desc: 'All towers passively regenerate 0.2 HP per second.',
    color: 0x44FF88,
  },
  // ACTIVE
  {
    id: 'dash',
    cat: 'ACTIVE',
    name: 'Dash',
    desc: 'Q: Burst to 900 speed for 180ms toward your movement direction. 5s cooldown.',
    color: 0x00FFDD,
  },
  {
    id: 'berserk',
    cat: 'ACTIVE',
    name: 'Berserk',
    desc: 'Q: 5 seconds of double damage and 1.5x speed with a red tint. 60s cooldown.',
    color: 0xFF2222,
  },
  {
    id: 'time_slow',
    cat: 'ACTIVE',
    name: 'Time Slow',
    desc: 'Q: Slow all enemies for 4 seconds. 90s cooldown.',
    color: 0x4466FF,
  },
  // CHAOS
  {
    id: 'glass_cannon',
    cat: 'CHAOS',
    name: 'Glass Cannon',
    desc: 'Cut your max HP in half, but double your attack damage permanently.',
    color: 0xFF44AA,
  },
  {
    id: 'giant_mode',
    cat: 'CHAOS',
    name: 'Giant Mode',
    desc: 'Grow to 1.5x scale with a larger body. Deal 50% more damage.',
    color: 0xAA44FF,
  },
  {
    id: 'unstable_power',
    cat: 'CHAOS',
    name: 'Unstable Power',
    desc: 'Every 8 seconds trigger a random burst: heal, explosion, brief invincibility, or tower reset.',
    color: 0xFF44FF,
  },
  // STRATEGY
  {
    id: 'wall_fortifier',
    cat: 'STRATEGY',
    name: 'Wall Fortifier',
    desc: 'All existing walls have their HP doubled immediately.',
    color: 0x888888,
  },
  {
    id: 'trap_master',
    cat: 'STRATEGY',
    name: 'Trap Master',
    desc: 'Traps deal 3x damage.',
    color: 0xAA6600,
  },
  {
    id: 'commander',
    cat: 'STRATEGY',
    name: 'Commander',
    desc: 'Towers within 96px of you gain a commander boost.',
    color: 0x6699FF,
  },
];

// ── Category colors for badges ───────────────────────────────
const CAT_COLORS = {
  COMBAT:   0xFF4444,
  TOWER:    0x44AAFF,
  ECONOMY:  0xFFDD44,
  ACTIVE:   0x00FFDD,
  CHAOS:    0xFF44FF,
  STRATEGY: 0x6699FF,
};

// Active ability priority order (first found wins)
const ACTIVE_PRIORITY = ['dash', 'berserk', 'time_slow'];

// ── Helpers ──────────────────────────────────────────────────

function pdist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// ── PerkSystem ───────────────────────────────────────────────

export class PerkSystem {
  constructor(scene) {
    this.scene = scene;

    /** @type {string[]} */
    this._active = [];

    // Active ability cooldown (ms remaining)
    this._activeAbilityCd = 0;

    // Berserk timer (ms remaining while active)
    this._berserkTimer = 0;

    // Time slow timer (ms remaining while active)
    this._timeSlowTimer = 0;

    // Unstable power timer (ms until next burst)
    this._unstableTimer = 8000;

    // Dash state
    this._dashTimer = 0;
    this._dashVx = 0;
    this._dashVy = 0;

    // Overclock shot tracking per tower (Map tower obj -> shot count)
    this._overclockShots = new Map();

    // Overlay container reference (null when not showing)
    this._overlay = null;
  }

  // ── Public API ─────────────────────────────────────────────

  has(id) {
    return this._active.includes(id);
  }

  offer() {
    if (this._overlay) return; // already showing

    const scene = this.scene;

    // Pause physics and suppress wave transitions
    scene.physics.pause();
    if (scene.waveMgr) scene.waveMgr.suppressTransitions = true;

    // Pick 3 distinct random perks from free perks + owned perk blueprints, excluding active
    const pool = PERK_DEFS.filter(p =>
      !this._active.includes(p.id) &&
      (FREE_PERKS.has(p.id) || blueprintSys.hasPerkBlueprint(p.id))
    );
    const picks = shuffle(pool).slice(0, 3);

    // Build overlay
    this._overlay = scene.add.container(0, 0).setDepth(100).setScrollFactor(0);

    // Dim background
    const dim = scene.add.rectangle(VW / 2, VH / 2, VW, VH, 0x000000, 0.75)
      .setScrollFactor(0);
    this._overlay.add(dim);

    // Title
    const title = scene.add.text(VW / 2, 60, 'CHOOSE A PERK', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    this._overlay.add(title);

    // Subtitle
    const subtitle = scene.add.text(VW / 2, 98, 'This power is yours for this run only', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#AAAAAA',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    this._overlay.add(subtitle);

    // Cards
    const cardW = 220;
    const cardH = 170;
    const cardSpacing = 30;
    const totalW = picks.length * cardW + (picks.length - 1) * cardSpacing;
    const startX = (VW - totalW) / 2;
    const cardY = 200;

    picks.forEach((perk, i) => {
      const cx = startX + i * (cardW + cardSpacing);
      this._buildCard(cx, cardY, cardW, cardH, perk);
    });

    // Skip button
    const skipBtn = scene.add.text(VW / 2, cardY + cardH + 36, '[ SKIP ]', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#666666',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    skipBtn.on('pointerover', () => skipBtn.setColor('#999999'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#666666'));
    skipBtn.on('pointerdown', () => this._closeOverlay());

    this._overlay.add(skipBtn);
  }

  triggerActive() {
    if (this._activeAbilityCd > 0) return;

    const activeId = ACTIVE_PRIORITY.find(id => this.has(id));
    if (!activeId) return;

    // Active abilities cost 25 energy
    const ENERGY_COST = 25;
    if ((this.scene.playerMP ?? 0) < ENERGY_COST) {
      if (this.scene.hud) this.scene.hud.showMsg('Not enough Energy!', 1200);
      return;
    }
    this.scene.playerMP -= ENERGY_COST;

    const scene = this.scene;

    if (activeId === 'dash') {
      const pl = scene.player;
      let vx = 0;
      let vy = 0;
      if (pl && pl.body) {
        vx = pl.body.velocity.x;
        vy = pl.body.velocity.y;
      }
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 0) {
        this._dashVx = (vx / len) * 900;
        this._dashVy = (vy / len) * 900;
      } else {
        // Default dash direction: right
        this._dashVx = 900;
        this._dashVy = 0;
      }
      this._dashTimer = 180;
      this._activeAbilityCd = 5000;

      // Teal particles
      if (scene.add.particles) {
        const emitter = scene.add.particles(pl ? pl.x : VW / 2, pl ? pl.y : VH / 2, '__DEFAULT', {
          speed: { min: 50, max: 120 },
          lifespan: 300,
          quantity: 12,
          tint: 0x00FFDD,
          scale: { start: 0.4, end: 0 },
          blendMode: 'ADD',
        });
        scene.time.delayedCall(400, () => { if (emitter && emitter.destroy) emitter.destroy(); });
      }
    } else if (activeId === 'berserk') {
      this._berserkTimer = 5000;
      this._activeAbilityCd = 60000;
      if (scene.player) scene.player.setTint(0xFF4444);
    } else if (activeId === 'time_slow') {
      scene._timeSlowActive = true;
      this._timeSlowTimer = 4000;
      this._activeAbilityCd = 90000;
      // Blue camera flash
      scene.cameras.main.flash(300, 0, 100, 255, false);
    }
  }

  update(delta) {
    const scene = this.scene;
    const active = this._active;

    // ── Active ability cooldown ──
    if (this._activeAbilityCd > 0) {
      this._activeAbilityCd = Math.max(0, this._activeAbilityCd - delta);
    }

    // ── Dash ──
    if (this._dashTimer > 0) {
      this._dashTimer = Math.max(0, this._dashTimer - delta);
      const pl = scene.player;
      if (pl && pl.body) {
        pl.body.setVelocity(this._dashVx, this._dashVy);
      }
      if (this._dashTimer <= 0) {
        if (pl && pl.body) {
          pl.body.setVelocity(0, 0);
        }
      }
    }

    // ── Berserk ──
    if (this._berserkTimer > 0) {
      this._berserkTimer = Math.max(0, this._berserkTimer - delta);
      if (this._berserkTimer <= 0) {
        if (scene.player) scene.player.clearTint();
        // berserk dmg/speed multipliers are checked externally via has('berserk') + _berserkTimer > 0
      }
    }

    // ── Time slow ──
    if (this._timeSlowTimer > 0) {
      this._timeSlowTimer = Math.max(0, this._timeSlowTimer - delta);
      if (this._timeSlowTimer <= 0) {
        scene._timeSlowActive = false;
      }
    }

    // ── Burning aura ──
    if (active.includes('burning_aura')) {
      const pl = scene.player;
      if (pl && scene.enemyMgr && scene.enemyMgr.enemies) {
        const dmg = 3 * delta * 0.001;
        for (const e of scene.enemyMgr.enemies) {
          if (!e || !e.sprite || !e.sprite.active) continue;
          if (pdist(pl.x, pl.y, e.sprite.x, e.sprite.y) <= 40) {
            e.hp -= dmg;
          }
        }
      }
    }

    // ── Commander ──
    if (active.includes('commander')) {
      const pl = scene.player;
      if (pl && scene.towerMgr && scene.towerMgr.towers) {
        for (const t of scene.towerMgr.towers) {
          if (!t || !t.sprite) continue;
          t._commanderBoost = pdist(pl.x, pl.y, t.sprite.x, t.sprite.y) < 96;
        }
      }
    }

    // ── Auto repair ──
    if (active.includes('auto_repair')) {
      if (scene.towerMgr && scene.towerMgr.towers) {
        const heal = delta * 0.0002;
        for (const t of scene.towerMgr.towers) {
          if (!t) continue;
          t.hp = Math.min(t.maxHp, t.hp + heal);
        }
      }
    }

    // ── Unstable power ──
    if (active.includes('unstable_power')) {
      this._unstableTimer -= delta;
      if (this._unstableTimer <= 0) {
        this._unstableTimer = 8000;
        this._triggerUnstableBurst();
      }
    }
  }

  serialize() {
    return { active: this._active.slice() };
  }

  restore(data) {
    if (!data || !Array.isArray(data.active)) return;
    for (const id of data.active) {
      if (!this._active.includes(id)) {
        this._active.push(id);
        this._applyPerk(id);
      }
    }
  }

  // ── Private: apply one-time perk effects ──────────────────

  _applyPerk(id) {
    const scene = this.scene;

    switch (id) {
      case 'sniper': {
        if (!scene.towerMgr) break;
        for (const t of scene.towerMgr.towers) {
          if (!t) continue;
          t.def = { ...t.def, range: Math.round(t.def.range * 1.4) };
        }
        break;
      }
      case 'overclock': {
        if (!scene.towerMgr) break;
        for (const t of scene.towerMgr.towers) {
          if (!t) continue;
          t.def = { ...t.def, rate: Math.round(t.def.rate * 0.65) };
        }
        break;
      }
      case 'chain_lightning': {
        if (!scene.towerMgr) break;
        for (const t of scene.towerMgr.towers) {
          if (!t || t.key !== 'voltspire') continue;
          t.def = { ...t.def, chain: 8 };
        }
        break;
      }
      case 'freeze_mastery': {
        if (!scene.towerMgr) break;
        for (const t of scene.towerMgr.towers) {
          if (!t || t.key !== 'frost') continue;
          t.def = { ...t.def, slow: 0.2 };
        }
        break;
      }
      case 'wall_fortifier': {
        if (!scene.towerMgr) break;
        for (const w of scene.towerMgr.walls) {
          if (!w) continue;
          w.hp = w.hp * 2;
          w.maxHp = w.maxHp * 2;
        }
        break;
      }
      case 'glass_cannon': {
        scene.playerMaxHP = Math.floor(scene.playerMaxHP * 0.5);
        scene.playerHP = Math.min(scene.playerHP, scene.playerMaxHP);
        scene.playerAttackDmg = scene.playerAttackDmg * 2;
        break;
      }
      case 'giant_mode': {
        const pl = scene.player;
        if (pl) {
          pl.setScale(1.5);
          if (pl.body) pl.body.setSize(30, 30);
        }
        scene.perkGiantDmgBoost = 1.5;
        break;
      }
      case 'trap_master': {
        scene.perkTrapMult = 3;
        break;
      }
      case 'greed': {
        scene.perkGreedMult = 2;
        break;
      }
      default:
        // Remaining perks (lifesteal, lucky_crit, headhunter, burning_aura,
        // double_shot, explosive_shots, scavenger, auto_repair, dash, berserk,
        // time_slow, unstable_power, commander) have no one-time setup —
        // they are handled in update() or checked externally via has().
        break;
    }
  }

  // ── Private: overlay helpers ──────────────────────────────

  _buildCard(cx, cy, cardW, cardH, perk) {
    const scene = this.scene;
    const overlay = this._overlay;

    // Card background
    const bg = scene.add.rectangle(cx + cardW / 2, cy + cardH / 2, cardW, cardH, 0x111118)
      .setScrollFactor(0);
    overlay.add(bg);

    // Colored border (drawn as a stroke rectangle)
    const border = scene.add.rectangle(cx + cardW / 2, cy + cardH / 2, cardW, cardH)
      .setStrokeStyle(2, perk.color)
      .setFillStyle(0x111118, 0)
      .setScrollFactor(0);
    overlay.add(border);

    // Category badge
    const catColor = CAT_COLORS[perk.cat] || 0xFFFFFF;
    const catHex = '#' + catColor.toString(16).padStart(6, '0');
    const badge = scene.add.text(cx + cardW / 2, cy + 14, perk.cat, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: catHex,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    overlay.add(badge);

    // Perk name
    const perkHex = '#' + perk.color.toString(16).padStart(6, '0');
    const nameText = scene.add.text(cx + cardW / 2, cy + 44, perk.name, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      wordWrap: { width: cardW - 16 },
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    overlay.add(nameText);

    // Description
    const descText = scene.add.text(cx + cardW / 2, cy + 80, perk.desc, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#DDCCAA',
      wordWrap: { width: cardW - 20 },
      align: 'center',
    }).setOrigin(0.5, 0.5).setScrollFactor(0);
    overlay.add(descText);

    // Choose button
    const btn = scene.add.text(cx + cardW / 2, cy + cardH - 18, '[ CHOOSE ]', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: perkHex,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setColor('#FFFFFF'));
    btn.on('pointerout', () => btn.setColor(perkHex));
    btn.on('pointerdown', () => {
      this._active.push(perk.id);
      this._applyPerk(perk.id);
      if (scene.hud && scene.hud.showMsg) {
        scene.hud.showMsg('Perk unlocked: ' + perk.name, 2500);
      }
      this._closeOverlay();
    });

    overlay.add(btn);
  }

  _closeOverlay() {
    if (!this._overlay) return;
    this._overlay.destroy();
    this._overlay = null;

    const scene = this.scene;
    scene.physics.resume();
    if (scene.waveMgr) scene.waveMgr.suppressTransitions = false;
  }

  // ── Private: unstable power burst ────────────────────────

  _triggerUnstableBurst() {
    const scene = this.scene;
    const roll = Math.floor(Math.random() * 4);

    if (roll === 0) {
      // Heal 15 HP
      scene.playerHP = Math.min(scene.playerMaxHP, scene.playerHP + 15);
      if (scene.hud && scene.hud.showMsg) scene.hud.showMsg('Unstable Power: Healed 15 HP', 1500);
    } else if (roll === 1) {
      // Explosion: 30 dmg within 120px of player
      const pl = scene.player;
      if (pl && scene.enemyMgr && scene.enemyMgr.enemies) {
        for (const e of scene.enemyMgr.enemies) {
          if (!e || !e.sprite || !e.sprite.active) continue;
          if (pdist(pl.x, pl.y, e.sprite.x, e.sprite.y) <= 120) {
            e.hp -= 30;
          }
        }
      }
      // Visual flash
      scene.cameras.main.flash(200, 255, 120, 0, false);
      if (scene.hud && scene.hud.showMsg) scene.hud.showMsg('Unstable Power: Explosion!', 1500);
    } else if (roll === 2) {
      // 2s invincibility — signal via scene flag, checked externally
      scene._perkInvincible = true;
      scene.time.delayedCall(2000, () => { scene._perkInvincible = false; });
      scene.cameras.main.flash(150, 255, 255, 255, false);
      if (scene.hud && scene.hud.showMsg) scene.hud.showMsg('Unstable Power: Invincible for 2s!', 1500);
    } else {
      // All towers reset lastFire to 0
      if (scene.towerMgr && scene.towerMgr.towers) {
        for (const t of scene.towerMgr.towers) {
          if (t) t.lastFire = 0;
        }
      }
      if (scene.hud && scene.hud.showMsg) scene.hud.showMsg('Unstable Power: Tower surge!', 1500);
    }
  }
}
