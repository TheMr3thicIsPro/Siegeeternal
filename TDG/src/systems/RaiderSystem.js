// ============================================================
// RaiderSystem — night raid events
//   · 10% chance each night (wave 3+)
//   · Builds a random enemy camp with corrupted turrets
//   · Turrets fire at the PLAYER (raid mechanic)
//   · Kill every raider + boss → earn a Blueprint
//   · Camp layout is randomised each time
// ============================================================
import { TS, MW, MH, VW } from '../constants.js';
import { blueprintSys }   from './BlueprintSystem.js';

// ── Camp layout templates ─────────────────────────────────
// Each entry: walls = tinted visual wall tiles, turrets = red firing towers
const CAMP_TEMPLATES = [
  // Hollow square (4 corner turrets)
  {
    walls:   [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]],
    turrets: [[-1,-1],[1,-1],[1,1],[-1,1]],
  },
  // Cross / T-intersection (4 arm-tip turrets)
  {
    walls:   [[0,-2],[0,-1],[0,0],[0,1],[0,2],[-1,0],[-2,0],[1,0],[2,0]],
    turrets: [[0,-2],[-2,0],[2,0],[0,2]],
  },
  // Diamond perimeter (cardinal turrets)
  {
    walls:   [[0,-2],[-1,-1],[1,-1],[-2,0],[2,0],[-1,1],[1,1],[0,2]],
    turrets: [[0,-2],[-2,0],[2,0],[0,2]],
  },
  // L-shape fortress (3 turrets)
  {
    walls:   [[-2,-1],[-2,0],[-2,1],[-1,1],[0,1],[1,1],[1,0],[1,-1]],
    turrets: [[-2,-1],[1,-1],[1,1]],
  },
  // Double-row palisade (4 corner turrets, 2 rows of walls)
  {
    walls:   [[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[-2,1],[-1,1],[0,1],[1,1],[2,1]],
    turrets: [[-2,-1],[2,-1],[-2,1],[2,1]],
  },
  // Pincer claws (2 wings, 4 turrets)
  {
    walls:   [[-3,-1],[-2,-1],[-3,1],[-2,1],[2,-1],[3,-1],[2,1],[3,1],[0,-1],[0,0],[0,1]],
    turrets: [[-3,-1],[-3,1],[3,-1],[3,1]],
  },
];

// Turret texture pool (will be tinted red — reuses existing tower sprites)
const TURRET_TEXES = ['tw_arrow','tw_ballista','tw_frost','tw_volt','tw_poison'];

// Enemy pool by wave tier — cursed enemy types are excluded (they live in the cursed zone only)
const ENEMY_POOL_EARLY = ['shambler','skitterer','ironback'];
const ENEMY_POOL_MID   = ['shambler','ironback','burrower','shade','nightcrawler'];
const ENEMY_POOL_LATE  = ['ironback','burrower','nightcrawler','voidbat','shamanbeast'];

export class RaiderSystem {
  constructor(scene) {
    this.scene        = scene;
    this.active       = false;
    this._turrets     = [];   // { sprite, wx, wy, hp, maxHp, rate, dmg, range, lastFire, alive }
    this._raiders     = [];   // enemy object refs from enemyMgr
    this._campGfx     = [];   // pure visual sprites/rects to destroy on cleanup
    this._hudBg       = null;
    this._hudTxt      = null;
    this._totalCount  = 0;
  }

  // ── Public entry: WaveManager calls this each night start ─

  maybeStartRaid(wave) {
    if (this.active)        return;   // never stack raids
    if (wave < 3)           return;   // grace period
    if (Math.random() >= 0.10) return;
    this._buildCamp(wave);
  }

  // ── Camp construction ─────────────────────────────────────

  _buildCamp(wave) {
    this.active      = true;
    this._turrets    = [];
    this._raiders    = [];
    this._campGfx    = [];
    this._totalCount = 0;

    const scene = this.scene;

    // ── Find a camp centre in the SAFE zone (south of river), far from player spawn ─
    const CX      = Math.floor(MW / 2);
    const CY      = Math.floor(MH / 2);
    // riverBot is the last river row; camps must start at least 3 tiles below it
    const minCY   = (scene.riverBot ?? Math.floor(MH * 0.33)) + 3;
    let cx = CX, cy = CY;
    let tries = 0;
    while (tries++ < 60 && (Math.hypot(cx - CX, cy - CY) < 14 || cy < minCY)) {
      cx = Phaser.Math.Between(10, MW - 11);
      cy = Phaser.Math.Between(minCY, MH - 11);
    }
    // Fallback — guaranteed valid position
    if (cy < minCY) { cx = Phaser.Math.Between(10, MW - 11); cy = minCY + 5; }

    // ── Pick a random layout and randomly mirror/flip it ─────
    const tpl = CAMP_TEMPLATES[Math.floor(Math.random() * CAMP_TEMPLATES.length)];
    const fx  = Math.random() < 0.5 ? -1 : 1;
    const fy  = Math.random() < 0.5 ? -1 : 1;
    const xf  = ([dx, dy]) => [dx * fx, dy * fy];
    const walls           = tpl.walls.map(xf);
    const turretOffsets   = tpl.turrets.map(xf);

    // ── Dark ground layer under the whole camp ───────────────
    const allTiles = [...walls, ...turretOffsets, [0,0]];
    for (const [dx, dy] of allTiles) {
      const wx = (cx + dx) * TS + TS / 2;
      const wy = (cy + dy) * TS + TS / 2;
      const g  = scene.add.rectangle(wx, wy, TS, TS, 0x440000, 0.50).setDepth(1);
      this._campGfx.push(g);
    }

    // ── Wall tiles (visual only — no physics body) ────────────
    for (const [dx, dy] of walls) {
      const wx = (cx + dx) * TS + TS / 2;
      const wy = (cy + dy) * TS + TS / 2;
      const sp = scene.add.sprite(wx, wy, 'wall_stone').setDepth(3).setTint(0x881111);
      this._campGfx.push(sp);
    }

    // ── Raider turrets (scale with wave) ─────────────────────
    const tHP   = Math.max(50,  60  + wave * 5);
    const tDmg  = Math.max(5,   6   + Math.floor(wave * 0.7));
    const tRate = Math.max(1600, 3500 - wave * 50);
    const tRng  = Phaser.Math.Between(100, 140);

    for (const [dx, dy] of turretOffsets) {
      const wx  = (cx + dx) * TS + TS / 2;
      const wy  = (cy + dy) * TS + TS / 2;
      const tex = TURRET_TEXES[Math.floor(Math.random() * TURRET_TEXES.length)];
      const sp  = scene.add.sprite(wx, wy, tex).setDepth(4).setTint(0xFF2244);
      const t   = { sprite: sp, wx, wy, hp: tHP, maxHp: tHP, rate: tRate, dmg: tDmg, range: tRng, lastFire: 0, alive: true };
      this._turrets.push(t);
      this._campGfx.push(sp);   // also tracked for cleanup
      this._totalCount++;
    }

    // ── Raider enemy units ────────────────────────────────────
    const pool       = wave >= 15 ? ENEMY_POOL_LATE : wave >= 7 ? ENEMY_POOL_MID : ENEMY_POOL_EARLY;
    const unitCount  = Phaser.Math.Between(4, Math.min(10, 4 + Math.floor(wave / 3)));

    for (let i = 0; i < unitCount; i++) {
      const angle = (i / unitCount) * Math.PI * 2;
      const r     = Phaser.Math.Between(40, 88);
      const wx    = cx * TS + TS / 2 + Math.cos(angle) * r;
      const wy    = cy * TS + TS / 2 + Math.sin(angle) * r;
      const key   = pool[Math.floor(Math.random() * pool.length)];
      scene.enemyMgr.spawnAt(key, wx, wy);
      const e = scene.enemyMgr.enemies[scene.enemyMgr.enemies.length - 1];
      if (e) {
        e.isRaider = true;
        this._raiders.push(e);
        this._totalCount++;
      }
      if (scene.waveMgr) scene.waveMgr.waveEnemiesLeft++;
    }

    // ── Raid boss at camp centre ──────────────────────────────
    scene.enemyMgr.spawnAt('raid_chief', cx * TS + TS / 2, cy * TS + TS / 2);
    const boss = scene.enemyMgr.enemies[scene.enemyMgr.enemies.length - 1];
    if (boss) {
      boss.isRaider   = true;
      boss.isRaidBoss = true;
      this._raiders.push(boss);
      this._totalCount++;
    }
    if (scene.waveMgr) scene.waveMgr.waveEnemiesLeft++;

    // ── HUD ───────────────────────────────────────────────────
    this._buildHUD();

    scene.hud?.showMsg(
      '⚠ RAID! Enemy camp appeared — their turrets TARGET YOU! Kill the Raid Chief + all raiders for a Blueprint!',
      8000,
    );
    scene.cameras?.main?.shake(400, 0.005);
  }

  // ── Per-frame update ──────────────────────────────────────

  update(time, delta) {
    if (!this.active) return;

    const scene = this.scene;

    // ── Turrets fire at player ────────────────────────────────
    for (const t of this._turrets) {
      if (!t.alive) continue;
      if (time - t.lastFire < t.rate) continue;
      const dist = Math.hypot(scene.player.x - t.wx, scene.player.y - t.wy);
      if (dist < t.range && scene.invincible <= 0 && time - scene.lastDmgTime > 600) {
        t.lastFire        = time;
        scene.lastDmgTime = time;
        const dmg = Math.max(1, t.dmg - (scene.playerArmor || 0));
        scene.playerHP = Math.max(0, scene.playerHP - dmg);
        scene.cameras?.main?.shake(70, 0.002);
        scene.enemyMgr?.spawnParticles(t.wx, t.wy, 0xFF2244, 4);
        if (scene.playerHP <= 0) scene.onPlayerDeath?.();
      }
    }

    // ── Tower projectiles damage raider turrets ───────────────
    for (const proj of (scene.towerMgr?.projectiles ?? [])) {
      if (!proj.sprite?.active) continue;
      for (const t of this._turrets) {
        if (!t.alive) continue;
        if (Math.hypot(proj.sprite.x - t.wx, proj.sprite.y - t.wy) < 16) {
          const dmg = Math.round((proj.towerDef?.dmg ?? 15) * (proj.tower?.dmgMult ?? 1));
          t.hp -= dmg;
          // Flash white then back to red
          if (t.sprite?.active) {
            t.sprite.setTint(0xFFFFFF);
            scene.time.delayedCall(60, () => { if (t.sprite?.active) t.sprite.setTint(0xFF2244); });
          }
          if (t.hp <= 0) {
            t.alive = false;
            t.sprite?.destroy();
            scene.enemyMgr?.spawnParticles(t.wx, t.wy, 0xFF4444, 10);
          }
          break;  // one proj hits one turret
        }
      }
    }

    // ── Player melee can hit turrets ──────────────────────────
    // (attack sets _attackCooldown to full; when it just reset a swing happened)
    // We check proximity at all times for a simpler, always-responsive feel
    if (scene._attackCooldown > 0) {
      for (const t of this._turrets) {
        if (!t.alive) continue;
        if (Math.hypot(scene.player.x - t.wx, scene.player.y - t.wy) < 63) {
          const dmg = scene.playerAttackDmg || 0;
          if (dmg > 0) {
            t.hp -= dmg;
            if (t.sprite?.active) {
              t.sprite.setTint(0xFFFFFF);
              scene.time.delayedCall(60, () => { if (t.sprite?.active) t.sprite.setTint(0xFF2244); });
            }
            if (t.hp <= 0) {
              t.alive = false;
              t.sprite?.destroy();
              scene.enemyMgr?.spawnParticles(t.wx, t.wy, 0xFF4444, 10);
            }
          }
        }
      }
    }

    // ── Check completion ──────────────────────────────────────
    if (this._turrets.length > 0 || this._raiders.length > 0) {
      const turretsDone = this._turrets.every(t => !t.alive);
      const raidersDone = this._raiders.every(r => !r.alive);
      if (turretsDone && raidersDone) {
        this._onRaidCleared();
        return;
      }
    }

    // ── Update HUD kill counter ───────────────────────────────
    const killed = this._turrets.filter(t => !t.alive).length
                 + this._raiders.filter(r => !r.alive).length;
    if (this._hudTxt) {
      const remaining = this._totalCount - killed;
      this._hudTxt.setText(`☠ RAID  ${killed}/${this._totalCount} killed  (${remaining} left)`);
    }
  }

  // ── Raid cleared — award blueprint ───────────────────────

  _onRaidCleared() {
    this.active = false;
    this._cleanup();

    const scene = this.scene;

    // Blueprint reward (random unlocked tower or perk blueprint)
    const bp = blueprintSys.unlockRandom();
    let rewardMsg;
    if (bp) {
      rewardMsg = `Blueprint unlocked: "${bp}"!`;
    } else {
      // Already owns everything — bonus resources instead
      scene.inventory.souls   = (scene.inventory.souls   || 0) + 60;
      scene.inventory.crystal = (scene.inventory.crystal || 0) + 12;
      rewardMsg = 'All blueprints owned! +60 souls & +12 crystal bonus!';
    }

    // Guaranteed bonus loot regardless
    scene.inventory.gold  = (scene.inventory.gold  || 0) + 20;
    scene.inventory.iron  = (scene.inventory.iron  || 0) + 12;
    scene.inventory.bone  = (scene.inventory.bone  || 0) + 15;

    scene.hud?.showMsg(`✓ RAID CLEARED! ${rewardMsg}  +20 gold +12 iron +15 bone`, 9000);
    scene.cameras?.main?.flash(250, 100, 255, 150);
    this._destroyHUD();
  }

  // ── HUD ──────────────────────────────────────────────────

  _buildHUD() {
    const scene = this.scene;
    this._hudBg = scene.add.rectangle(VW / 2, 110, 320, 22, 0x440000, 0.88)
      .setScrollFactor(0).setDepth(55).setStrokeStyle(1, 0xFF2244);
    this._hudTxt = scene.add.text(VW / 2, 110, '☠ RAID  0/0 killed  (0 left)', {
      fontSize: '11px', fill: '#FF8888', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(56);
  }

  _destroyHUD() {
    this._hudBg?.destroy();
    this._hudTxt?.destroy();
    this._hudBg  = null;
    this._hudTxt = null;
  }

  // ── Wave ended while raid still active (raiders nowhere to be found) ─

  onWaveEnd() {
    if (!this.active) return;
    // Check if all raiders are dead — just the turrets might be left
    const raidersDone = this._raiders.every(r => !r.alive);
    if (raidersDone) {
      // All enemies dead, only turrets remain — auto-complete with full reward
      this._onRaidCleared();
    } else {
      // Some raiders survived the night — give a partial consolation reward
      this.active = false;
      this._cleanup();
      const scene = this.scene;
      scene.inventory.bone = (scene.inventory.bone || 0) + 8;
      scene.inventory.iron = (scene.inventory.iron || 0) + 5;
      scene.hud?.showMsg('The raiders pulled back at dawn. Partial loot recovered.', 5000);
      this._destroyHUD();
    }
  }

  // ── Cleanup all camp visuals ──────────────────────────────

  _cleanup() {
    for (const sp of this._campGfx) {
      if (sp && typeof sp.destroy === 'function') sp.destroy();
    }
    this._campGfx = [];
    this._turrets = [];
    this._raiders = [];
  }
}
