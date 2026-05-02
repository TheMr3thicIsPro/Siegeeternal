// ============================================================
// TowerManager — towers, machines, walls, projectiles
// ============================================================
import { TS, MW, MH, TOWER_DEFS, MACHINE_DEFS, WALL_DEFS, PROJ_TEX, CURSED_TOWER_DEFS, CURSED_PROJ_TEX } from '../constants.js';
import { pdist } from '../utils.js';

const WALL_BAR_W   = 28;
const WALL_BAR_H   = 3;

// ── Tower element classification for synergy system ───────
const FIRE_TOWERS     = new Set(['flame', 'bonefire', 'cannon']);
const ELECTRIC_TOWERS = new Set(['volt', 'chain_spire']);
const FROST_TOWERS    = new Set(['frost']);
const POISON_TOWERS   = new Set(['poison']);
const CURSE_TOWERS    = new Set(['curse_totem']);

export class TowerManager {
  constructor(scene) {
    this.scene       = scene;
    this.towers      = [];
    this.machines    = [];
    this.walls       = [];
    this.projectiles = [];
    this._cursedGfx  = new Map();  // key "tx,ty" → { rect, tween }

    // Static physics group — walls are solid blockers.
    // Adding/removing from this group automatically
    // updates Arcade Physics collision broadphase.
    this.wallGroup = scene.physics.add.staticGroup();
  }

  // ── Placement ───────────────────────────────────────────

  placeTower(key, tx, ty) {
    const def = TOWER_DEFS[key] || CURSED_TOWER_DEFS[key];
    if (!def) return null;
    const isCursed = !!CURSED_TOWER_DEFS[key];
    const sp  = this.scene.add.sprite(tx * TS + TS / 2, ty * TS + TS / 2, def.tex).setDepth(3);
    const isDay = this.scene.waveMgr?.isDay !== false;
    const active = isDay ? def.dayOn : def.nightOn;
    const obj = {
      def, key, sprite: sp, grid: { x: tx, y: ty },
      lastFire: 0, hp: 110, maxHp: 110, active,
      upgLevel: 0, kills: 0, dmgMult: 1,
      corruptionTimer: 0, corrupted: false,
      isCursed,
    };
    sp.setAlpha(active ? 1 : 0.4);
    if (isCursed) sp.setTint(0xCC44FF);
    this.scene.mapData[ty][tx].structure = obj;
    this.towers.push(obj);
    this.scene.enemyMgr.spawnParticles(sp.x, sp.y, isCursed ? 0xAA44FF : 0xC8A96E, 6);
    return obj;
  }

  /** Remove a tower from the scene (used by siege_leech drain kill) */
  destroyTower(towerObj) {
    if (!towerObj) return;
    const idx = this.towers.indexOf(towerObj);
    if (idx === -1) return;
    this.scene.enemyMgr?.spawnParticles(towerObj.sprite.x, towerObj.sprite.y, 0x884444, 8);
    towerObj.sprite.destroy();
    const { x, y } = towerObj.grid;
    if (this.scene.mapData[y]?.[x]) this.scene.mapData[y][x].structure = null;
    this.towers.splice(idx, 1);
  }

  placeMachine(key, tx, ty, defOverride = null) {
    const def = defOverride || MACHINE_DEFS[key];
    const sp  = this.scene.add.sprite(tx * TS + TS / 2, ty * TS + TS / 2, def.tex).setDepth(3);
    const obj = { def, key, sprite: sp, grid: { x: tx, y: ty }, timer: 0 };
    this.scene.mapData[ty][tx].structure = obj;
    this.machines.push(obj);
    return obj;
  }

  placeWall(wallType, tx, ty) {
    const def = WALL_DEFS[wallType] || WALL_DEFS.stone;
    const wx = tx * TS + TS / 2;
    const wy = ty * TS + TS / 2;

    // Sprite
    const sp = this.scene.add.sprite(wx, wy, def.tex).setDepth(3);

    // Fire walls are passthrough — enemies walk through them; no physics body.
    const isPassthrough = !!(def.passthrough);
    if (!isPassthrough) {
      // Let StaticGroup create and own the static body — do NOT call
      // physics.add.existing first or the body can end up double-registered.
      this.wallGroup.add(sp, false);   // false = already added to scene display list
      this.wallGroup.refresh();        // rebuild broadphase so new body is collidable
    }

    // HP bar (world-space, above the wall)
    const hpBg   = this.scene.add.rectangle(wx, wy - 20, WALL_BAR_W, WALL_BAR_H, 0x220000).setDepth(4);
    const hpFill = this.scene.add.rectangle(wx - WALL_BAR_W / 2, wy - 20, WALL_BAR_W, WALL_BAR_H, 0x44BB44)
      .setOrigin(0, 0.5).setDepth(5);
    // Hide HP bar until the wall takes damage
    hpBg.setVisible(false);
    hpFill.setVisible(false);

    const obj = {
      sprite: sp,
      grid: { x: tx, y: ty },
      type: wallType,
      hp: def.hp,
      maxHp: def.hp,
      hpBg,
      hpFill,
      alive: true,
      passthrough: isPassthrough,
    };

    this.scene.mapData[ty][tx].structure = obj;
    this.walls.push(obj);
    return obj;
  }

  // ── Wall damage & destruction ────────────────────────────

  damageWall(wallObj, amount) {
    if (!wallObj.alive) return;
    wallObj.hp = Math.max(0, wallObj.hp - amount);
    wallObj.lastDmgTime = Date.now();
    this._updateWallBar(wallObj);
    if (wallObj.hp <= 0) this.destroyWall(wallObj);
  }

  removeWall(wallObj) {
    if (!wallObj.alive) return;
    wallObj.alive = false;
    if (!wallObj.passthrough) {
      if (wallObj.sprite.body) wallObj.sprite.body.enable = false;
      this.wallGroup.remove(wallObj.sprite, false, false);
      this.wallGroup.refresh();
    }
    wallObj.sprite.destroy();
    wallObj.hpBg.destroy();
    wallObj.hpFill.destroy();
    const { x, y } = wallObj.grid;
    if (this.scene.mapData[y]?.[x]) this.scene.mapData[y][x].structure = null;
    this.walls = this.walls.filter(w => w !== wallObj);
  }

  destroyWall(wallObj) {
    if (!wallObj.alive) return;
    wallObj.alive = false;

    if (!wallObj.passthrough) {
      if (wallObj.sprite.body) wallObj.sprite.body.enable = false;
      this.wallGroup.remove(wallObj.sprite, false, false);
      this.wallGroup.refresh();
    }

    // Visual rubble
    wallObj.sprite.setAlpha(0.3).setTint(0x665544);

    // Remove HP bar
    wallObj.hpBg.destroy();
    wallObj.hpFill.destroy();

    // Free the map cell so something else can be built
    const { x, y } = wallObj.grid;
    if (this.scene.mapData[y]?.[x]) this.scene.mapData[y][x].structure = null;

    // Scatter particles
    this.scene.enemyMgr.spawnParticles(wallObj.sprite.x, wallObj.sprite.y, 0x7A7065, 8);
  }

  _updateWallBar(wall) {
    const pct  = wall.hp / wall.maxHp;
    const show = pct < 0.999;
    wall.hpBg.setVisible(show);
    wall.hpFill.setVisible(show);
    wall.hpFill.setSize(WALL_BAR_W * pct, WALL_BAR_H);

    // Colour shifts green → yellow → red as HP drops
    const col = pct > 0.5 ? 0x44BB44 : pct > 0.25 ? 0xDDAA00 : 0xCC2200;
    wall.hpFill.setFillStyle(col);

    // Keep bar above the sprite
    const wx = wall.sprite.x, wy = wall.sprite.y - 20;
    wall.hpBg.setPosition(wx, wy);
    wall.hpFill.setPosition(wx - WALL_BAR_W / 2, wy);
  }

  // ── Sell structure ───────────────────────────────────────
  // Returns { name, refund } on success, null if nothing to sell.

  sellStructure(tx, ty) {
    const cell = this.scene.mapData[ty]?.[tx];
    if (!cell?.structure) return null;

    const obj = cell.structure;
    let name = '', cost = {};

    const towerIdx   = this.towers.findIndex(t => t === obj);
    const machineIdx = this.machines.findIndex(m => m === obj);
    const wallIdx    = this.walls.findIndex(w => w === obj);

    if (towerIdx !== -1) {
      const t = this.towers[towerIdx];
      name = t.def.name;
      const wasCorrupted   = t.corrupted;
      const wasPlayerCursed = t._playerCursed;
      cost = (wasCorrupted || wasPlayerCursed) ? {} : t.def.cost;
      t.sprite.destroy();
      this.towers.splice(towerIdx, 1);
      if (wasCorrupted) {
        // Selling an enemy-corrupted (red) tower leaves a RED cursed tile
        cell.structure = null;
        this.addCurse(tx, ty);
        this.scene.enemyMgr?.spawnParticles(tx * TS + TS / 2, ty * TS + TS / 2, 0xFF2244, 14);
        return { name: `${name} (enemy-cursed — no refund, RED tile remains)`, refund: {} };
      }
      if (wasPlayerCursed) {
        // Selling a player-claimed cursed (black) tower removes the curse entirely
        cell.structure = null;
        this.removeCurse(tx, ty);
        this.scene.enemyMgr?.spawnParticles(tx * TS + TS / 2, ty * TS + TS / 2, 0x8844FF, 10);
        return { name: `${name} (cursed tower sold — ground cleansed)`, refund: {} };
      }

    } else if (machineIdx !== -1) {
      const m = this.machines[machineIdx];
      name = m.def.name;
      cost = m.def.cost;
      m.sprite.destroy();
      this.machines.splice(machineIdx, 1);

    } else if (wallIdx !== -1) {
      const w = this.walls[wallIdx];
      if (!w.alive) return null;   // rubble — nothing to sell
      const wallDef = WALL_DEFS[w.type] || WALL_DEFS.stone;
      name = wallDef.name;
      cost = wallDef.cost;
      if (!w.passthrough) {
        this.wallGroup.remove(w.sprite, false, false);
        this.wallGroup.refresh();
      }
      w.sprite.destroy();
      w.hpBg.destroy();
      w.hpFill.destroy();
      this.walls.splice(wallIdx, 1);

    } else {
      return null;
    }

    // Free the cell
    cell.structure = null;

    // Refund 50 % of original cost (floored)
    const refund = {};
    Object.entries(cost).forEach(([r, n]) => {
      const amt = Math.max(1, Math.floor(n * 0.5));
      this.scene.inventory[r] = (this.scene.inventory[r] || 0) + amt;
      refund[r] = amt;
    });

    this.scene.enemyMgr.spawnParticles(
      tx * TS + TS / 2, ty * TS + TS / 2, 0xD4A017, 6
    );

    return { name, refund };
  }

  // ── Active state (day/night) ─────────────────────────────

  refreshActiveState(isDay) {
    for (const tower of this.towers) {
      tower.active = isDay ? tower.def.dayOn : tower.def.nightOn;
      tower.sprite.setAlpha(tower.active ? 1 : 0.4);
    }
  }

  updateTowerActiveState() {
    const isDay = this.scene.waveMgr?.isDay ?? true;
    this.refreshActiveState(isDay);
  }

  // ── Update loops ─────────────────────────────────────────

  creditKill(tower) {
    if (!tower) return;
    tower.kills = (tower.kills ?? 0) + 1;
    // Soul Turret: gains +2 dmg per kill
    if (tower.key === 'soul_turret') {
      tower.dmgMult = 1 + tower.kills * 0.08;
      if (tower.kills % 10 === 0) {
        this.scene.hud?.showMsg(`Soul Turret powered up! (${tower.kills} kills)`, 1500);
        this.scene.enemyMgr?.spawnParticles(tower.sprite.x, tower.sprite.y, 0xAA44FF, 6);
      }
    }
    if (tower.upgLevel >= 9) return;
    if (tower.kills % 100 === 0) {
      tower.upgLevel++;
      tower.maxHp = Math.round(110 * (1 + tower.upgLevel * 0.1));
      tower.hp    = Math.min(tower.hp + 11, tower.maxHp);
      this.scene.hud?.showMsg(`${tower.def.name} → Lv${tower.upgLevel + 1}!`, 2500);
      this.scene.enemyMgr?.spawnParticles(tower.sprite.x, tower.sprite.y, 0xD4A017, 12);
    }
  }

  updateCorruption(delta, time) {
    const scene   = this.scene;
    const enemies = scene.enemyMgr?.enemies ?? [];
    // Enemies must be actively attacking (within melee range) for 3s to corrupt a tower
    // Dark Corruption mutation triples the corruption rate
    const corruptMult  = scene.mutationSys?.corruptionMult() ?? 1;
    const THRESH       = 3000 / corruptMult;
    const ATTACK_RANGE = 22;

    for (const tower of this.towers) {
      if (tower.corrupted) {
        // Enemy-corrupted tower (RED tint) fires at the player — it will attack you!
        if (!tower._lastCorruptAtk || time - tower._lastCorruptAtk > 2000) {
          tower._lastCorruptAtk = time;
          const dx = scene.player.x - tower.sprite.x;
          const dy = scene.player.y - tower.sprite.y;
          if (Math.hypot(dx, dy) < tower.def.range * 1.5 && scene.invincible <= 0 && time - scene.lastDmgTime > 500) {
            scene.lastDmgTime = time;
            const dmg = Math.max(1, Math.floor(tower.def.dmg * 0.5) - (scene.playerArmor || 0));
            scene.playerHP = Math.max(0, scene.playerHP - dmg);
            scene.cameras?.main?.shake(80, 0.002);
            scene.enemyMgr?.spawnParticles(tower.sprite.x, tower.sprite.y, 0xFF2244, 4);
            if (scene.playerHP <= 0) scene.onPlayerDeath?.();
          }
        }
        continue;
      }

      // Skip player-claimed cursed towers (black tint) — they fire at enemies normally
      if (tower._playerCursed) continue;

      let near = 0;
      for (const e of enemies) {
        if (e.alive && Math.hypot(e.sprite.x - tower.sprite.x, e.sprite.y - tower.sprite.y) < ATTACK_RANGE) near++;
      }
      if (near > 0) {
        tower.corruptionTimer = (tower.corruptionTimer || 0) + delta;
        if (tower.corruptionTimer >= THRESH) {
          tower.corrupted = true;
          tower.corruptionTimer = 0;
          tower.sprite.setTint(0xFF2244);  // RED tint = enemy-corrupted, attacks YOU
          scene.hud?.showMsg(`⚠ ${tower.def.name} CURSED by enemies — it will attack YOU until you uncurse it (E + token) or sell it!`, 5500);
          scene.cameras?.main?.shake(300, 0.004);
        }
      } else {
        tower.corruptionTimer = Math.max(0, (tower.corruptionTimer || 0) - delta * 0.5);
      }
    }
  }

  addCurse(tx, ty) {
    if (!this.scene.cursedTiles) this.scene.cursedTiles = new Set();
    const key = `${tx},${ty}`;
    if (this.scene.cursedTiles.has(key)) return;
    this.scene.cursedTiles.add(key);
    const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
    const g  = this.scene.add.rectangle(wx, wy, TS - 2, TS - 2, 0xAA0033, 0.35).setDepth(2);
    const tw = this.scene.tweens.add({ targets: g, alpha: { from: 0.15, to: 0.5 }, duration: 1400, yoyo: true, repeat: -1 });
    this._cursedGfx.set(key, { rect: g, tween: tw });
  }

  removeCurse(tx, ty) {
    if (!this.scene.cursedTiles) return;
    const key = `${tx},${ty}`;
    if (!this.scene.cursedTiles.has(key)) return;
    this.scene.cursedTiles.delete(key);
    const gfx = this._cursedGfx.get(key);
    if (gfx) {
      gfx.tween?.stop();
      gfx.rect?.destroy();
      this._cursedGfx.delete(key);
    }
  }

  updateTowers(time, delta) {
    if (delta) this.updateCorruption(delta, time);
    const enemies = this.scene.enemyMgr.enemies;

    for (const tower of this.towers) {
      // Tick hex debuff off
      if (tower._hexed > 0) {
        tower._hexed -= delta;
        if (tower._hexed <= 0) {
          tower._hexed  = 0;
          tower.dmgMult = tower._baseDmgMult ?? 1;
          if (tower.sprite.active) tower.sprite.clearTint();
        }
      }

      if (tower.corrupted) continue;
      if (!tower.active)   continue;
      if (this.scene.weatherSystem?.isTowerDisabled(tower.key)) continue;
      if (time - tower.lastFire < tower.def.rate) continue;

      // Curse Totem — AOE pulse, no projectile
      if (tower.key === 'curse_totem') {
        tower.lastFire = time;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (pdist(tower.sprite, enemy.sprite) < tower.def.range) {
            enemy.def = { ...enemy.def, dmg: Math.max(1, Math.ceil(enemy.def.dmg * 0.7)) };
            enemy.slow = Math.min(enemy.slow, 0.7);
            enemy.slowTimer = Math.max(enemy.slowTimer, 2500);
            // CURSED AMPLIFY synergy — mark enemy for +30% damage
            enemy.cursedStatus = true;
          }
        }
        this.scene.enemyMgr?.spawnParticles(tower.sprite.x, tower.sprite.y, 0x660088, 5);
        continue;
      }

      // Grave Tower — spawn skeleton minions instead of firing projectile
      if (tower.key === 'grave_tower') {
        tower.lastFire = time;
        const ex = tower.sprite.x + Phaser.Math.Between(-48, 48);
        const ey = tower.sprite.y + Phaser.Math.Between(-48, 48);
        this.scene.enemyMgr?.spawnAt('skeleton', ex, ey, {
          name: 'Skeleton', hp: 40, spd: 60, dmg: 12, sz: 12, drop: {}, isMinion: true,
        });
        if (this.scene.waveMgr) this.scene.waveMgr.waveEnemiesLeft++;
        continue;
      }

      const minR = tower.def.minRange || 0;
      let target = null, nearestD = tower.def.range;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const d = pdist(tower.sprite, enemy.sprite);
        if (d >= minR && d < nearestD) { nearestD = d; target = enemy; }
      }
      if (!target) continue;

      // Blood Tower — uses 1 player HP per shot
      if (tower.def.hpCost) {
        const s = this.scene;
        if ((s.playerHP ?? 0) <= 1) continue; // don't fire if at 1 HP
        s.playerHP = Math.max(1, (s.playerHP ?? 1) - tower.def.hpCost);
      }

      tower.lastFire = time;
      if (tower.def.beam) this._fireBeam(tower, target);
      else                this._fire(tower, target);
    }
  }

  updateMachines(delta) {
    for (const m of this.machines) {
      m.timer += delta;
      if (m.timer >= m.def.interval) {
        m.timer = 0;
        Object.entries(m.def.produces).forEach(([r, n]) => {
          this.scene.inventory[r] = (this.scene.inventory[r] || 0) + n;
        });
      }
    }
  }

  updateWalls(delta) {
    const now = Date.now();
    const enemies = this.scene.enemyMgr.enemies;

    for (const wall of this.walls) {
      if (!wall.alive) continue;

      if (wall.type === 'mob_soul' && wall.hp < wall.maxHp) {
        if (!wall.lastDmgTime || now - wall.lastDmgTime >= 5000) {
          wall.hp = Math.min(wall.maxHp, wall.hp + delta * 0.04);
          this._updateWallBar(wall);
        }
      }

      if (wall.type === 'fire_wall') {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (pdist(wall.sprite, enemy.sprite) >= 26) continue;
          enemy.dot      = 3;
          enemy.dotTimer = 1000;
          if (!enemy.fireHitTimer || enemy.fireHitTimer <= 0) {
            enemy.fireHitTimer = 800;
            this.damageWall(wall, 1);
            if (!wall.alive) break;
          }
        }
      }
    }

    for (const enemy of enemies) {
      if (enemy.fireHitTimer > 0) enemy.fireHitTimer -= delta;
    }
  }

  updateProjectiles(delta) {
    const dt      = delta / 1000;
    const enemies = this.scene.enemyMgr.enemies;
    const toKill  = [];

    for (const proj of this.projectiles) {
      proj.sprite.x += proj.vx * dt;
      proj.sprite.y += proj.vy * dt;
      proj.dist     += Math.hypot(proj.vx, proj.vy) * dt;

      let hit = false;

      if (proj.aoe) {
        if (!proj.target?.alive || pdist(proj.sprite, proj.target.sprite) < 22) {
          for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (pdist(proj.sprite, enemy.sprite) < proj.aoe) this._applyHit(proj, enemy);
          }
          this.scene.enemyMgr.spawnParticles(proj.sprite.x, proj.sprite.y,
            proj.towerKey === 'frost' ? 0x5BBCB0 : 0xFF6400, 8);
          hit = true;
        }
      } else {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (pdist(proj.sprite, enemy.sprite) < 14) {
            if (proj.pierce) {
              // Void cannon pierces — don't stop, continue through all enemies
              if (!proj.piercedSet.has(enemy)) {
                proj.piercedSet.add(enemy);
                this._applyHit(proj, enemy);
              }
              continue;
            }

            this._applyHit(proj, enemy);

            // Chain lightning (voltspire chain=3, chain_spire chain=8)
            // CHAIN STORM synergy: electric + wet weather → 6 extra chains, 200px range
            if (proj.towerDef.chain) {
              const isWet       = enemy.wet ?? false;
              const chainBonus  = isWet ? 6 : 0;
              const chainDist   = isWet ? 200 : 120;
              const chained = new Set([enemy]);
              let last = enemy, rem = proj.towerDef.chain + chainBonus;
              while (rem-- > 0) {
                let next = null, nd = chainDist;
                for (const e2 of enemies) {
                  if (!e2.alive || chained.has(e2)) continue;
                  const d = pdist(last.sprite, e2.sprite);
                  if (d < nd) { nd = d; next = e2; }
                }
                if (!next) break;
                chained.add(next);
                next.hp -= proj.towerDef.dmg * 0.5;
                // Propagate CHAIN STORM particles if wet
                if (isWet) this.scene.enemyMgr?.spawnParticles(next.sprite.x, next.sprite.y, 0x44DDFF, 3);
                last = next;
              }
            }
            hit = true;
            break;
          }
        }
      }

      if (hit || proj.dist > proj.maxDist) toKill.push(proj);
    }

    for (const proj of toKill) proj.sprite.destroy();
    this.projectiles = this.projectiles.filter(p => !toKill.includes(p));
  }

  // ── Internals ────────────────────────────────────────────

  _fireBeam(tower, target) {
    // Shield absorb check
    if (target._shield) {
      target._shield = false;
      this.scene.enemyMgr?.spawnParticles(target.sprite.x, target.sprite.y, 0xAAAAFF, 6);
      return;
    }
    target.lastHitTower = tower;
    let dmg = Math.round(tower.def.dmg * (tower.dmgMult ?? 1));
    if (target.def.armor) dmg = Math.max(1, dmg - target.def.armor);
    if (target.cursedStatus) dmg = Math.round(dmg * 1.3);
    target.hp -= dmg;
    if (target.sprite.active) {
      target.sprite.setTint(0xFFEE00);
      this.scene.time.delayedCall(80, () => { if (target.sprite.active) target.sprite.clearTint(); });
    }
    const g = this.scene.add.graphics().setDepth(15);
    g.lineStyle(2, 0xFFEE00, 0.9);
    g.lineBetween(tower.sprite.x, tower.sprite.y, target.sprite.x, target.sprite.y);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  _fire(tower, target) {
    const dx  = target.sprite.x - tower.sprite.x;
    const dy  = target.sprite.y - tower.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    const tex = PROJ_TEX[tower.key] || CURSED_PROJ_TEX[tower.key] || 'proj_arrow';
    const spd = tower.key === 'void_cannon' ? 200 : 300;
    const sp  = this.scene.add.sprite(tower.sprite.x, tower.sprite.y, tex).setDepth(15);
    this.projectiles.push({
      sprite: sp, vx: dx / len * spd, vy: dy / len * spd,
      towerDef: tower.def, towerKey: tower.key, tower,
      maxDist: tower.def.range * (tower.def.pierce ? 2.5 : 1.5), dist: 0,
      target, aoe: tower.def.aoe || 0,
      pierce: tower.def.pierce ?? false,
      piercedSet: new Set(),
    });
  }

  _applyHit(proj, enemy) {
    // ── Shield absorption (mutation) ─────────────────────
    if (enemy._shield) {
      enemy._shield = false;
      if (enemy.sprite.active) {
        enemy.sprite.setTint(0xAAAAFF);
        this.scene.time.delayedCall(180, () => { if (enemy.sprite.active) enemy.sprite.clearTint(); });
      }
      this.scene.enemyMgr?.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0xAAAAFF, 8);
      return;   // hit absorbed
    }

    // ── Bonefire immunity (mutation) ─────────────────────
    if (enemy._mutBonefireImmune && proj.towerKey === 'bonefire') return;

    if (proj.tower) enemy.lastHitTower = proj.tower;
    const tKey = proj.towerKey;

    // Snapshot pre-hit status for synergy combo detection
    const wasPoisoned    = enemy.poisoned;
    const wasBurning     = enemy.burning;
    const wasElectrified = enemy.electrified;
    const wasFrozen      = enemy.frozen;

    let dmg = Math.round(proj.towerDef.dmg * (proj.tower?.dmgMult ?? 1));
    if (enemy.def.armor) dmg = Math.max(1, dmg - enemy.def.armor);

    // ── Synergy: SHATTER — frozen enemy takes 2.5× from non-frost ─
    if (wasFrozen && !FROST_TOWERS.has(tKey)) {
      dmg = Math.round(dmg * 2.5);
      this.scene.enemyMgr?.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0xAAEEFF, 8);
    }

    // ── Synergy: CURSED AMPLIFY — cursed enemies take +30% ──
    if (enemy.cursedStatus) dmg = Math.round(dmg * 1.3);

    enemy.hp -= dmg;

    if (enemy.sprite.active) {
      enemy.sprite.setTint(0xFFFFFF);
      this.scene.time.delayedCall(60, () => { if (enemy.sprite.active) enemy.sprite.clearTint(); });
    }

    // Apply slow (frost immune mutation blocks this)
    if (proj.towerDef.slow && !enemy._mutFrostImmune) {
      enemy.slow      = proj.towerDef.slow;
      enemy.slowTimer = 2000;
    }
    if (proj.towerDef.dot)  { enemy.dot  = proj.towerDef.dot;  enemy.dotTimer  = 1000; }

    // ── Set element status flags ──────────────────────────
    if (FIRE_TOWERS.has(tKey)) {
      enemy.burning = true; enemy.burningTimer = 3000;
    }
    if (ELECTRIC_TOWERS.has(tKey)) {
      enemy.electrified = true; enemy.electrifiedTimer = 2500;
    }
    if (FROST_TOWERS.has(tKey) && proj.towerDef.slow) {
      enemy.frozen = true; enemy.frozenTimer = 2500;
    }
    if (POISON_TOWERS.has(tKey) || proj.towerDef.dot) {
      enemy.poisoned = true; enemy.poisonedTimer = 4000;
    }
    if (CURSE_TOWERS.has(tKey)) {
      enemy.cursedStatus = true;
    }

    // ── Synergy: TOXIC BLAST — fire hits poisoned → AOE poison ─
    if (FIRE_TOWERS.has(tKey) && wasPoisoned) {
      const TOX_AOE = 96;
      for (const other of this.scene.enemyMgr.enemies) {
        if (!other.alive || other === enemy) continue;
        if (Math.hypot(other.sprite.x - enemy.sprite.x, other.sprite.y - enemy.sprite.y) < TOX_AOE) {
          other.hp       -= 15;
          other.poisoned  = true; other.poisonedTimer = Math.max(other.poisonedTimer, 3000);
          other.dot       = Math.max(other.dot, 3); other.dotTimer = 1000;
        }
      }
      this.scene.enemyMgr?.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0x88FF44, 12);
    }

    // ── Synergy: NEURO SHOCK — electric hits poisoned → stun 1.5s ─
    if (ELECTRIC_TOWERS.has(tKey) && wasPoisoned && enemy.stunTimer <= 0) {
      enemy.stunTimer = 1500;
      this.scene.enemyMgr?.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0xFFFF44, 8);
    }

    // ── Synergy: DECAY FREEZE — frost hits poisoned → heavy slow + 2× DoT ─
    if (FROST_TOWERS.has(tKey) && wasPoisoned && enemy.dot > 0) {
      enemy.slow      = Math.min(enemy.slow, 0.2);
      enemy.slowTimer = Math.max(enemy.slowTimer, 3000);
      enemy.dot       = Math.ceil(enemy.dot * 2);
      this.scene.enemyMgr?.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0x44FFAA, 6);
    }

    // ── Synergy: OVERLOAD — fire+electric combo → marks enemy for death AOE ─
    if (FIRE_TOWERS.has(tKey)     && wasElectrified) enemy._overload = true;
    if (ELECTRIC_TOWERS.has(tKey) && wasBurning)     enemy._overload = true;
  }

  // ── Save / load ──────────────────────────────────────────

  serialize() {
    return {
      towers:   this.towers.map(t  => ({ key: t.key,  gx: t.grid.x, gy: t.grid.y, hp: t.hp, kills: t.kills ?? 0, upgLevel: t.upgLevel ?? 0, isCursed: t.isCursed ?? false })),
      machines: this.machines.map(m => ({ key: m.key,  gx: m.grid.x, gy: m.grid.y })),
      walls:    this.walls.map(w    => ({ gx: w.grid.x, gy: w.grid.y, hp: w.hp, alive: w.alive, type: w.type || 'stone' })),
    };
  }

  restore(data, isDay) {
    (data.towers   || []).forEach(t => {
      if (!TOWER_DEFS[t.key] && !CURSED_TOWER_DEFS[t.key]) return;
      const obj = this.placeTower(t.key, t.gx, t.gy);
      if (!obj) return;
      obj.hp       = t.hp;
      obj.kills    = t.kills    ?? 0;
      obj.upgLevel = t.upgLevel ?? 0;
      obj.isCursed = t.isCursed ?? false;
      if (obj.upgLevel > 0) obj.maxHp = Math.round(110 * (1 + obj.upgLevel * 0.1));
    });
    (data.machines || []).forEach(m => {
      if (!MACHINE_DEFS[m.key]) return;
      this.placeMachine(m.key, m.gx, m.gy);
    });
    (data.walls    || []).forEach(w => {
      const obj = this.placeWall(w.type || 'stone', w.gx, w.gy);
      obj.hp = w.hp;
      if (!w.alive || w.hp <= 0) this.destroyWall(obj);
    });
    this.refreshActiveState(isDay);
  }
}
