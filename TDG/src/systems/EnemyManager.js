// ============================================================
// EnemyManager — spawn, update, and remove enemies
// ============================================================
import { TS, MW, MH, ENEMY_DEFS, CURSED_ENEMY_KEYS, DUNGEON_KEY_DROP_CHANCE } from '../constants.js';
import { pdist } from '../utils.js';
import { soundMgr } from './SoundManager.js';

export class EnemyManager {
  constructor(scene) {
    this.scene   = scene;
    this.enemies = [];   // live enemy objects
  }

  /** Spawn an enemy of type `key` at a random map edge */
  spawnAtEdge(key) {
    const edge = Math.floor(Math.random() * 4);
    let ex, ey;
    const rnd = () => Phaser.Math.Between(2, MW - 3) * TS + TS / 2;
    if      (edge === 0) { ex = rnd();             ey = TS + TS / 2; }
    else if (edge === 1) { ex = (MW - 2) * TS + TS / 2; ey = rnd(); }
    else if (edge === 2) { ex = rnd();             ey = (MH - 2) * TS + TS / 2; }
    else                 { ex = TS + TS / 2;       ey = rnd(); }
    this.spawnAt(key, ex, ey);
  }

  /** Spawn an enemy at an explicit world position */
  spawnAt(key, wx, wy, overrideDef = null) {
    const scene = this.scene;
    const def = overrideDef || ENEMY_DEFS[key];
    if (!def) return;

    // Cursed enemy types must stay in the cursed zone (north of river).
    // Block any attempt to spawn them in the safe overworld area.
    if (CURSED_ENEMY_KEYS.has(key)) {
      const czMaxY = scene.cursedZoneMaxY ?? -1;
      const tileY  = Math.floor(wy / TS);
      if (czMaxY >= 0 && tileY > czMaxY) return;
    }

    const texKey = `e_${key}`;
    const sz     = def.sz || 14;
    const sp     = scene.add.sprite(wx, wy, texKey).setDepth(9);
    scene.physics.add.existing(sp);
    sp.body.setSize(sz, sz);

    if (def.invis) sp.setAlpha(0.3);

    // Physics collider with wall group — enemies are physically blocked by walls.
    // This collider persists for the enemy's lifetime and covers ALL walls in the group,
    // including ones placed after this enemy spawned.
    scene.physics.add.collider(sp, scene.towerMgr.wallGroup);

    // HP bar (two thin rectangles that follow the sprite)
    const barW  = sz * 2;
    const hpBg  = scene.add.rectangle(wx, wy - sz - 6, barW, 3, 0x220000).setDepth(9);
    const hpFill= scene.add.rectangle(wx - barW / 2, wy - sz - 6, barW, 3, 0xCC2200).setOrigin(0, 0.5).setDepth(10);

    const enemy = {
      def, key,
      sprite: sp,
      hp: def.hp,
      maxHp: def.hp,
      hpBg, hpFill,
      // status effects
      slow: 1, slowTimer: 0,
      dot: 0,  dotTimer: 0,
      // ── Synergy / mutation status flags ──────────────────
      burning:          false, burningTimer:     0,
      electrified:      false, electrifiedTimer: 0,
      wet:              false,
      frozen:           false, frozenTimer:      0,
      poisoned:         false, poisonedTimer:    0,
      cursedStatus:     false,
      stunTimer:        0,     // NEURO SHOCK stun
      // ── Mutation flags (set by MutationSystem.applyToSpawn)
      _mutExplode:        false,
      _mutBonefireImmune: false,
      _mutFrostImmune:    false,
      _mutDoubleHeal:     false,
      _mutBerserk:        false, _mutBerserkActive: false,
      _mutVenomous:       false,
      _shield:            false,
      _overload:          false, // marked for death explosion by OVERLOAD synergy
      _isZombie:          false, // zombie-wave spawn — no further chaining
      // ── Behaviour timers ──────────────────────────────────
      burrowTimer: def.burrow  ? Phaser.Math.Between(3000, 6000) : 0,
      burrowed: false,
      arcAngle: 0,
      spawnTimer: def.spawns   ? Phaser.Math.Between(5000, 10000) : 0,
      hasSplit: false,
      wallHitTimer: 0,
      alive: true,
      // Crystal Wraith phase shift (null = not yet sampled; set on first update frame)
      _lastHp: null,
      _phaseShiftCooldown: 0,
    };

    // Apply weather HP buff (blood moon, solar eclipse, mega storm…)
    const hpMult = scene.weatherSystem ? scene.weatherSystem.enemyHPMult() : 1.0;
    if (hpMult !== 1.0) {
      enemy.hp    = Math.ceil(enemy.hp * hpMult);
      enemy.maxHp = enemy.hp;
    }

    // Apply boss-kill escalation buff (grows +15% each time a boss dies)
    const bb = scene.bossBuff;
    if (bb && (bb.hpMult > 1.0 || bb.dmgMult > 1.0)) {
      enemy.hp    = Math.ceil(enemy.hp    * bb.hpMult);
      enemy.maxHp = enemy.hp;
      enemy.def   = { ...enemy.def, dmg: Math.ceil(enemy.def.dmg * bb.dmgMult) };
    }

    // Hardcore mode HP/dmg buff
    if (scene.isHardcore) {
      enemy.hp     = Math.ceil(enemy.hp * 1.15);
      enemy.maxHp  = enemy.hp;
      enemy.def    = { ...enemy.def, dmg: Math.ceil(enemy.def.dmg * 1.15) };
      if (def.boss) {
        enemy.hp    = Math.ceil(enemy.hp * 1.25);
        enemy.maxHp = enemy.hp;
        enemy.def   = { ...enemy.def, dmg: Math.ceil(enemy.def.dmg * 1.25) };
      }
    }

    // Cursed zone: enemies spawned north of river are 2× HP/dmg, 1.5× speed
    const czMaxY = scene.cursedZoneMaxY ?? -1;
    const tileY  = Math.floor(wy / (32));   // TS=32 hardcoded to avoid import cycle
    if (czMaxY >= 0 && tileY <= czMaxY) {
      enemy.hp    = Math.ceil(enemy.hp * 2.0);
      enemy.maxHp = enemy.hp;
      enemy.def   = { ...enemy.def, dmg: Math.ceil(enemy.def.dmg * 2.0), spd: Math.ceil(enemy.def.spd * 1.5) };
      enemy.isCursedZone = true;
      sp.setTint(0xBB44FF);
    }

    // Cursed enemy types always get purple tint regardless of spawn position
    if (CURSED_ENEMY_KEYS.has(key)) {
      sp.setTint(0xAA44FF);
      // Blocked by the river physics just like the player — bridge tiles remove the body
      if (scene.riverGroup) scene.physics.add.collider(sp, scene.riverGroup);
    }

    // Enemy chestplates: wave 15+, non-boss only
    if (!def.boss && (scene.wave ?? 0) >= 15) {
      const roll = Math.random();
      if (roll < 0.10) {
        enemy.def = { ...enemy.def, armor: (enemy.def.armor || 0) + 12 };
        enemy.chestplate = 'crystal';
        sp.setTint(0x88DDCC);
      } else if (roll < 0.25) {
        enemy.def = { ...enemy.def, armor: (enemy.def.armor || 0) + 5 };
        enemy.chestplate = 'iron';
        sp.setTint(0xAABBCC);
      }
    }

    this.enemies.push(enemy);

    // Apply active mutation flags (bonefire immune, explode, etc.)
    scene.mutationSys?.applyToSpawn(enemy);
  }

  /** Called every frame from GameScene.update() */
  update(delta, time) {
    const scene = this.scene;
    const px = scene.player.x;
    const py = scene.player.y;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const sp  = enemy.sprite;
      const def = enemy.def;

      // ── Status effects ───────────────────────────
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= delta;
        if (enemy.slowTimer <= 0) { enemy.slow = 1; enemy.frozen = false; }
      }
      if (enemy.dot > 0) {
        enemy.dotTimer -= delta;
        if (enemy.dotTimer <= 0) {
          enemy.hp       -= enemy.dot;
          enemy.dotTimer  = 1000;
        }
      }
      // Synergy / mutation timers
      if (enemy.burningTimer > 0)     { enemy.burningTimer     -= delta; if (enemy.burningTimer     <= 0) enemy.burning     = false; }
      if (enemy.electrifiedTimer > 0) { enemy.electrifiedTimer -= delta; if (enemy.electrifiedTimer <= 0) enemy.electrified = false; }
      if (enemy.frozenTimer > 0)      { enemy.frozenTimer      -= delta; if (enemy.frozenTimer      <= 0) enemy.frozen      = false; }
      if (enemy.poisonedTimer > 0)    { enemy.poisonedTimer    -= delta; if (enemy.poisonedTimer    <= 0) enemy.poisoned    = false; }
      // Wet: active whenever it is raining / thunderstorm / mega storm
      enemy.wet = ['rain','thunderstorm','mega_storm'].includes(scene.weatherSystem?.current);

      // NEURO SHOCK stun — zero velocity handled below in movement
      if (enemy.stunTimer > 0) {
        enemy.stunTimer -= delta;
        if (enemy.stunTimer <= 0) enemy.stunTimer = 0;
      }

      // ── Burrower ────────────────────────────────
      if (def.burrow) {
        enemy.burrowTimer -= delta;
        if (enemy.burrowTimer <= 0) {
          enemy.burrowed    = !enemy.burrowed;
          sp.setAlpha(enemy.burrowed ? 0.1 : 1);
          enemy.burrowTimer = enemy.burrowed
            ? Phaser.Math.Between(2000, 4000)
            : Phaser.Math.Between(4000, 8000);
          if (!enemy.burrowed) this.spawnParticles(sp.x, sp.y, 0x8B6914, 5);
        }
        if (enemy.burrowed) { sp.body.setVelocity(0, 0); this._updateHPBar(enemy); continue; }
      }

      // ── Bone stealth — enemies ignore player beyond detection range ──
      {
        const boneChest = scene.armor === 'armor_bone';
        const bonePants = scene.pants  === 'bone_pants';
        if (boneChest || bonePants) {
          const baseRange  = boneChest ? 200 : 96;
          const pantsMulti = bonePants ? 0.70 : 1.0;
          if (Math.hypot(sp.x - px, sp.y - py) > baseRange * pantsMulti) {
            sp.body.setVelocity(0, 0);
            this._updateHPBar(enemy);
            continue;
          }
        }
      }

      // ── Dummy statue decoy — enemies within 200px are drawn to it ──
      {
        let nearestDecoy = null, nearestDecoyD = 200;
        for (const m of (scene.towerMgr?.machines ?? [])) {
          if (!m.def?.decoy || !m.sprite?.active) continue;
          const d = Math.hypot(sp.x - m.sprite.x, sp.y - m.sprite.y);
          if (d < nearestDecoyD) { nearestDecoyD = d; nearestDecoy = m; }
        }
        if (nearestDecoy) {
          const ddx = nearestDecoy.sprite.x - sp.x, ddy = nearestDecoy.sprite.y - sp.y;
          const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const weatherMult = scene.weatherSystem ? scene.weatherSystem.enemySpeedMult() : 1.0;
          const spd = def.spd * enemy.slow * weatherMult * 0.85;
          sp.body.setVelocity(ddx / dlen * spd, ddy / dlen * spd);
          // Hit the statue when adjacent
          if (nearestDecoyD < 24) {
            enemy._decoyHitTimer = (enemy._decoyHitTimer ?? 0) - delta;
            if (enemy._decoyHitTimer <= 0) {
              enemy._decoyHitTimer = 600;
              nearestDecoy.hp = (nearestDecoy.hp ?? nearestDecoy.def.hp ?? 150) - def.dmg;
              this.spawnParticles(nearestDecoy.sprite.x, nearestDecoy.sprite.y, 0xCCBBAA, 3);
              if (nearestDecoy.hp <= 0) {
                scene.hud?.showMsg('Dummy Statue destroyed!', 2000);
                this.spawnParticles(nearestDecoy.sprite.x, nearestDecoy.sprite.y, 0xAAA090, 10);
                const { x, y } = nearestDecoy.grid;
                if (scene.mapData[y]?.[x]) scene.mapData[y][x].structure = null;
                nearestDecoy.sprite.destroy();
                scene.towerMgr.machines = scene.towerMgr.machines.filter(m => m !== nearestDecoy);
              }
            }
          }
          this._updateHPBar(enemy);
          continue;
        }
      }

      // ── Target selection ────────────────────────
      let tx = px, ty = py;
      // Supply crate targeting — non-boss enemies have 50% chance to go for active supply drop
      const supplyObj = scene.miniObjSys?._obj?.type === 'supply_drop' ? scene.miniObjSys._obj : null;
      if (supplyObj && !def.boss && Math.random() < 0.5) {
        tx = supplyObj.wx; ty = supplyObj.wy;
      } else if (def.targetsStructures) {
        let nearS = null, nearD = Infinity;
        const structs = [...scene.towerMgr.towers, ...scene.towerMgr.walls.filter(w => w.alive)];
        for (const s of structs) {
          const d = pdist(sp, s.sprite);
          if (d < nearD) { nearD = d; nearS = s; }
        }
        if (nearS) { tx = nearS.sprite.x; ty = nearS.sprite.y; }
      } else if (def.machines) {
        // Looters: target machines first, fall back to towers, then player
        let nearM = null, nearMD = Infinity;
        for (const m of scene.towerMgr.machines) {
          const d = pdist(sp, m.sprite);
          if (d < nearMD) { nearMD = d; nearM = m; }
        }
        if (nearM) {
          tx = nearM.sprite.x; ty = nearM.sprite.y;
        } else if (scene.towerMgr.towers.length > 0) {
          let nearT = null, nearTD = Infinity;
          for (const t of scene.towerMgr.towers) {
            const d = pdist(sp, t.sprite);
            if (d < nearTD) { nearTD = d; nearT = t; }
          }
          if (nearT) { tx = nearT.sprite.x; ty = nearT.sprite.y; }
        }
      }

      // ── NEURO SHOCK stun — skip movement this frame ─────
      if (enemy.stunTimer > 0) {
        sp.body.setVelocity(0, 0);
        this._updateHPBar(enemy);
        continue;
      }

      // ── Movement ────────────────────────────────
      const dx  = tx - sp.x, dy = ty - sp.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const weatherMult = scene.weatherSystem ? scene.weatherSystem.enemySpeedMult() : 1.0;
      // Ruby set slow aura: enemies within 64px of player move at 85% speed at night
      let auraSlowMult = 1;
      if (!scene.waveMgr?.isDay && scene._getArmorSet?.() === 'ruby' && Math.hypot(sp.x - px, sp.y - py) < 64) auraSlowMult = 0.85;
      const spd = def.spd * enemy.slow * weatherMult * 0.85 * auraSlowMult;

      if (def.arc) {
        // Voidbat: arc toward target
        enemy.arcAngle += delta * 0.002;
        const perpX = -dy / len, perpY = dx / len;
        sp.body.setVelocity(
          (dx / len + perpX * Math.sin(enemy.arcAngle)) * spd,
          (dy / len + perpY * Math.sin(enemy.arcAngle)) * spd,
        );
      } else {
        sp.body.setVelocity(dx / len * spd, dy / len * spd);
      }

      // ── Separation push ─────────────────────────
      for (const other of this.enemies) {
        if (other === enemy || !other.alive) continue;
        const ox = sp.x - other.sprite.x, oy = sp.y - other.sprite.y;
        const od = Math.sqrt(ox * ox + oy * oy);
        if (od < 20 && od > 0) { sp.x += ox / od * 1.5; sp.y += oy / od * 1.5; }
      }

      // ── Wall damage — 600ms cooldown between hits ────────
      if (enemy.wallHitTimer > 0) {
        enemy.wallHitTimer -= delta;
      } else {
        let hitAny = false;
        for (const wall of scene.towerMgr.walls) {
          if (!wall.alive || wall.passthrough) continue;
          if (pdist(sp, wall.sprite) < 26) {
            scene.towerMgr.damageWall(wall, def.dmg);
            hitAny = true;
          }
        }
        if (hitAny) enemy.wallHitTimer = 600;
      }

      // ── HP regen (Crystal Wraith & any regen enemy) ─────
      if (def.regen && enemy.hp < enemy.maxHp) {
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + def.regen * delta * 0.001);
      }

      // ── Phase shift — teleport 30% chance when hit ──────
      if (def.phaseShift) {
        const hpDelta = (enemy._lastHp ?? enemy.hp) - enemy.hp;
        enemy._lastHp = enemy.hp;
        if (hpDelta > 0 && enemy._phaseShiftCooldown <= 0 && Math.random() < 0.30) {
          const angle  = Math.random() * Math.PI * 2;
          const dist   = Phaser.Math.Between(80, 130);
          const wb     = scene.physics.world.bounds;
          sp.x = Phaser.Math.Clamp(sp.x + Math.cos(angle) * dist, wb.left + TS * 2, wb.right  - TS * 2);
          sp.y = Phaser.Math.Clamp(sp.y + Math.sin(angle) * dist, wb.top  + TS * 2, wb.bottom - TS * 2);
          this.spawnParticles(sp.x, sp.y, 0x88EEEE, 8);
          enemy._phaseShiftCooldown = 1500;
          soundMgr.phaseShift();
        }
        if (enemy._phaseShiftCooldown > 0) enemy._phaseShiftCooldown -= delta;
      } else {
        enemy._lastHp = enemy.hp;
      }

      // ── Attack player ───────────────────────────
      if (pdist(sp, { x: px, y: py }) < 22 && scene.invincible <= 0 && time - scene.lastDmgTime > 800) {
        const _armorSet = scene._getArmorSet?.();
        // Ghost Dancer (bone full set): 20% chance enemy ignores player
        const ghostDodge = _armorSet === 'bone' && Math.random() < 0.20;
        // Ruby pants: 15% dodge chance
        const pantsDodge = scene.pants === 'ruby_pants' && Math.random() < 0.15;
        if (!ghostDodge && !pantsDodge) {
          scene.lastDmgTime = time;
          let armored = Math.max(0, def.dmg - (scene.playerArmor || 0));
          if (scene.armor === 'armor_ruby'    && !scene.waveMgr?.isDay)  armored = Math.floor(armored * 0.85);
          if (scene.armor === 'armor_emerald' && scene.scene?.key === 'Cave') armored = Math.floor(armored * 0.85);
          // Iron set bonus: flat 8 damage reduction (applied after armor)
          if (_armorSet === 'iron') armored = Math.max(0, armored - 8);
          scene.playerHP    = Math.max(0, scene.playerHP - armored);
          scene.cameras.main.shake(100, 0.003);
          sp.setTint(0xFF4444);
          scene.time.delayedCall(120, () => { if (sp.active) sp.clearTint(); });
          soundMgr.playerHurt();
          // ── VENOMOUS mutation — inflict poison DoT on player ─
          if (enemy._mutVenomous) {
            scene._playerPoisonTimer = 5000;
            scene._playerPoisonDot   = 3;
          }
          if (scene.playerHP <= 0) scene.onPlayerDeath();
        }
      }

      // ── Berserker mutation — ravagers go berserk below 50% HP ─
      if (enemy._mutBerserk && !enemy._mutBerserkActive && enemy.hp < enemy.maxHp * 0.5) {
        enemy._mutBerserkActive = true;
        enemy.def = { ...enemy.def, spd: Math.round(enemy.def.spd * 2), dmg: Math.round(enemy.def.dmg * 1.5) };
        sp.setTint(0xFF4400);   // orange glow while berserk
      }

      // ── Healer (Shamanbeast) — 0.017 HP/ms per nearby ally ─
      if (def.heals) {
        const healRate = enemy._mutDoubleHeal ? 0.034 : 0.017;
        for (const other of this.enemies) {
          if (other === enemy || !other.alive) continue;
          if (pdist(sp, other.sprite) < 80) other.hp = Math.min(other.maxHp, other.hp + delta * healRate);
        }
      }

      // ── Hex Shaman — weakens all towers within 96px (-30% dmg) ──
      if (def.hexes) {
        enemy._hexTimer = (enemy._hexTimer ?? 0) - delta;
        if (enemy._hexTimer <= 0) {
          enemy._hexTimer = 3000;
          for (const tower of scene.towerMgr.towers) {
            if (pdist(sp, tower.sprite) < 96) {
              tower._hexed    = 3500;
              tower.dmgMult   = Math.min(tower.dmgMult ?? 1, 0.7);
              if (tower.sprite.active) tower.sprite.setTint(0x884488);
            }
          }
        }
      }

      // ── Siege Leech — attaches to nearest tower, drains 2 HP/s ─
      if (def.leechTower) {
        if (!enemy._leechTarget || !enemy._leechTarget.hp || enemy._leechTarget.hp <= 0) {
          let nearest = null, nearD = 48;
          for (const tower of scene.towerMgr.towers) {
            const d = pdist(sp, tower.sprite);
            if (d < nearD) { nearD = d; nearest = tower; }
          }
          enemy._leechTarget = nearest;
        }
        if (enemy._leechTarget) {
          const lt = enemy._leechTarget;
          const d  = pdist(sp, lt.sprite);
          if (d < 24) {
            // Leeching
            const drain = delta * 0.002;
            lt.hp        = Math.max(0, lt.hp - drain);
            enemy.hp     = Math.min(enemy.maxHp, enemy.hp + drain * 0.5);
            this._updateHPBar(enemy);
            if (lt.hp <= 0) scene.towerMgr.destroyTower?.(lt);
          } else {
            // Move toward leech target
            const dx = lt.sprite.x - sp.x, dy = lt.sprite.y - sp.y;
            const len = Math.sqrt(dx*dx+dy*dy)||1;
            sp.body.setVelocity(dx/len*def.spd*0.85, dy/len*def.spd*0.85);
          }
        }
      }

      // ── Soul Eater — drains HP from nearest tower ───────
      if (def.drainsTower) {
        enemy._drainTimer = (enemy._drainTimer ?? 0) - delta;
        if (enemy._drainTimer <= 0) {
          enemy._drainTimer = 1500;
          let nearest = null, nearD = 80;
          for (const tower of scene.towerMgr.towers) {
            const d = pdist(sp, tower.sprite);
            if (d < nearD) { nearD = d; nearest = tower; }
          }
          if (nearest) {
            nearest.hp  = Math.max(0, nearest.hp - 10);
            enemy.hp    = Math.min(enemy.maxHp, enemy.hp + 5);
            this.spawnParticles(nearest.sprite.x, nearest.sprite.y, 0xAA44FF, 4);
          }
        }
      }

      // ── Boss sub-spawner ─────────────────────────
      if (def.spawns && enemy.spawnTimer > 0) {
        enemy.spawnTimer -= delta;
        if (enemy.spawnTimer <= 0) {
          enemy.spawnTimer = Phaser.Math.Between(5000, 10000);
          this.spawnAt(def.spawns, sp.x + Phaser.Math.Between(-40, 40), sp.y + Phaser.Math.Between(-40, 40));
          scene.waveMgr.waveEnemiesLeft++;
        }
      }

      // ── HP bar position ──────────────────────────
      this._updateHPBar(enemy);

      // ── Death check ─────────────────────────────
      if (enemy.hp <= 0) this._killEnemy(enemy);
    }

    // Purge dead entries
    this.enemies = this.enemies.filter(e => e.alive);
  }

  _updateHPBar(enemy) {
    const sp  = enemy.sprite;
    const sz  = enemy.def.sz || 14;
    const bw  = sz * 2;
    const pct = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.hpBg.setPosition(sp.x, sp.y - sz - 6);
    enemy.hpFill.setPosition(sp.x - bw / 2, sp.y - sz - 6);
    enemy.hpFill.setSize(bw * pct, 3);
  }

  _killEnemy(enemy) {
    const sp    = enemy.sprite;
    const scene = this.scene;

    // Nightcrawler / splitter_beast splits
    if (enemy.def.splits && !enemy.hasSplit) {
      enemy.hasSplit = true;
      const splitKey   = enemy.def.splitKey ?? enemy.key;
      const splitCount = enemy.def.splitCount ?? 2;
      for (let i = 0; i < splitCount; i++) {
        const childDef = { ...enemy.def, hp: Math.ceil(enemy.def.hp * 0.5), splits: false, splitKey: undefined, sz: Math.floor((enemy.def.sz || 14) * 0.7) };
        this.spawnAt(splitKey, sp.x + (i === 0 ? -22 : 22), sp.y, childDef);
        scene.waveMgr.waveEnemiesLeft++;
      }
    }

    // Credit kill to nearest attacking tower
    if (enemy.lastHitTower) {
      scene.towerMgr?.creditKill(enemy.lastHitTower);
    }

    // Boss-kill escalation — every boss death makes ALL enemies permanently 15% stronger
    if (enemy.def.boss) {
      scene.bossKillCount = (scene.bossKillCount || 0) + 1;
      const prev = scene.bossBuff ?? { hpMult: 1.0, dmgMult: 1.0, countMult: 1.0 };
      scene.bossBuff = {
        hpMult:    prev.hpMult    * 1.15,
        dmgMult:   prev.dmgMult   * 1.15,
        countMult: prev.countMult * 1.15,
      };
      const pctStr = Math.round((scene.bossBuff.hpMult - 1) * 100);
      scene.hud?.showMsg(
        `Boss slain! Enemies are now ${pctStr}% stronger — forever.`,
        5000
      );
    }

    // Relic on-kill effects
    scene.relicSys?.onKill(enemy);

    // Player level XP
    scene.playerLevelSys?.addXP(enemy);

    // Contract kill progress
    scene.contractSys?.progress('kills', 1);
    if (enemy.def.boss) scene.contractSys?.progress('boss_kills', 1);

    const isBounty = scene.waveMgr?.isBountyRound ?? false;
    const relicMult = scene.relicSys?.dropMult() ?? 1;
    const scarceMult = scene.challengeMods?.scarce ? 0.5 : 1;
    const dropMult = (isBounty ? 2 : 1) * relicMult * scarceMult;

    // Drop resources directly into inventory
    if (enemy.def.drop) {
      Object.entries(enemy.def.drop).forEach(([r, n]) => {
        scene.inventory[r] = (scene.inventory[r] || 0) + Math.ceil(n * dropMult);
      });
    }

    // Cursed zone enemies have extra cursed resource drops
    if (enemy.isCursedZone && Math.random() < 0.35) {
      const cursedDrops = ['cursed_essence', 'void_shards', 'corrupted_wood'];
      const pick = cursedDrops[Math.floor(Math.random() * cursedDrops.length)];
      scene.inventory[pick] = (scene.inventory[pick] || 0) + 1;
    }

    // Crystal Wraith gem drop — random crystal / ruby / emerald
    if (enemy.def.gemDrop) {
      const r   = Math.random();
      const gem = r < 0.50 ? 'crystal' : r < 0.80 ? 'ruby' : 'emerald';
      scene.inventory[gem] = (scene.inventory[gem] || 0) + dropMult;
      this.spawnParticles(sp.x, sp.y, gem === 'crystal' ? 0x5BBCB0 : gem === 'ruby' ? 0xCC2244 : 0x50C878, 10);
      scene.hud?.showMsg(`Crystal Wraith dropped ${gem}!`, 2000);
    }

    // Crystal Wraith — 40% chance to drop a Regular Key
    if (enemy.key === 'cave_wraith' && Math.random() < 0.40) {
      scene.inventory.key_regular = (scene.inventory.key_regular || 0) + 1;
      this.spawnParticles(sp.x, sp.y, 0xC8A882, 12);
      scene.hud?.showMsg('Crystal Wraith dropped a Regular Key!', 3000);
    }

    // Boss kill — always drops a Boss Key
    if (enemy.def.boss) {
      scene.inventory.key_boss = (scene.inventory.key_boss || 0) + 1;
      this.spawnParticles(sp.x, sp.y, 0xD4A017, 14);
      scene.hud?.showMsg('Boss dropped a Boss Key! Find the Boss Chest on the map.', 4000);
    }

    // Souls drop
    const soulsDrop = enemy.def.boss ? 10 : 1;
    scene.inventory.souls = (scene.inventory.souls || 0) + soulsDrop * dropMult;

    // Death sound
    if (enemy.def.boss) soundMgr.bossDie();
    else                soundMgr.die();

    this.spawnParticles(sp.x, sp.y, 0xC45C3A, enemy.def.boss ? 14 : 5);

    // ── Mutation: BLAZING SHAMBLERS — explode on death ────
    if (enemy._mutExplode) {
      const AOE = 80, EXDMG = 50;
      this.spawnParticles(sp.x, sp.y, 0xFF6600, 18);
      this.spawnParticles(sp.x, sp.y, 0xFFCC44, 10);
      if (Math.hypot(scene.player.x - sp.x, scene.player.y - sp.y) < AOE && scene.invincible <= 0) {
        scene.playerHP = Math.max(0, scene.playerHP - Math.max(1, EXDMG - (scene.playerArmor || 0)));
        scene.cameras?.main?.shake(250, 0.007);
        if (scene.playerHP <= 0) scene.onPlayerDeath?.();
      }
    }

    // ── Synergy: OVERLOAD — fire+electric combo → death AOE ──
    if (enemy._overload) {
      const RAOE = 64, RDMG = 30;
      this.spawnParticles(sp.x, sp.y, 0xFF4444, 14);
      for (const other of this.enemies) {
        if (!other.alive || other === enemy) continue;
        if (Math.hypot(other.sprite.x - sp.x, other.sprite.y - sp.y) < RAOE) {
          other.hp -= RDMG;
        }
      }
      if (Math.hypot(scene.player.x - sp.x, scene.player.y - sp.y) < RAOE && scene.invincible <= 0) {
        scene.playerHP = Math.max(0, scene.playerHP - Math.max(1, RDMG - (scene.playerArmor || 0)));
        scene.cameras?.main?.shake(100, 0.004);
        if (scene.playerHP <= 0) scene.onPlayerDeath?.();
      }
    }

    // ── Mutation: ZOMBIE WAVE — spawn a weak zombie on kill ──
    if (scene.mutationSys?.isZombieWave() && !enemy.def.boss && !enemy._isZombie) {
      const zombieDef = { name: 'Zombie', hp: 20, spd: 28, dmg: 4, sz: 12, drop: {} };
      this.spawnAt('shambler', sp.x + Phaser.Math.Between(-16, 16), sp.y + Phaser.Math.Between(-16, 16), zombieDef);
      // Mark the zombie so it doesn't chain-spawn more zombies
      const zombie = this.enemies[this.enemies.length - 1];
      if (zombie) zombie._isZombie = true;
      scene.waveMgr.waveEnemiesLeft++;
    }

    // ── Mutation: BONE STORM — +3 extra bone per kill ─────
    if (scene.mutationSys?.isBoneStorm() && !enemy.def.boss) {
      scene.inventory.bone = (scene.inventory.bone || 0) + 3;
    }

    // 2% chance to drop a Dungeon Key from any non-boss, non-dungeon enemy
    if (!enemy.def.boss && !enemy.def.dungeon && Math.random() < DUNGEON_KEY_DROP_CHANCE) {
      scene.inventory.dungeon_key = (scene.inventory.dungeon_key || 0) + 1;
      this.spawnParticles(sp.x, sp.y, 0xAA55FF, 10);
      scene.hud?.showMsg('Dungeon Key dropped! Find the Dungeon entrance in the cursed zone.', 4000);
    }

    // Raider kill — no tower spawns (removed)

    sp.destroy();
    enemy.hpBg.destroy();
    enemy.hpFill.destroy();
    enemy.alive = false;

    scene.waveMgr.waveEnemiesLeft--;
    if (scene.waveMgr.waveEnemiesLeft <= 0) scene.waveMgr.onWaveCleared();
  }

  /** Kill all night-type enemies at dawn (they burn) */
  burnNightEnemies() {
    const nightSet = new Set(['voidbat', 'shade', 'nightcrawler']);
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      if (!nightSet.has(enemy.key)) continue;
      // Burn tint then kill
      if (enemy.sprite.active) {
        enemy.sprite.setTint(0xFF4400);
        this.spawnParticles(enemy.sprite.x, enemy.sprite.y, 0xFF4400, 6);
      }
      enemy.hp = 0;
      this._killEnemy(enemy);
    }
  }

  /** Scatter coloured particle rectangles from a world position */
  spawnParticles(x, y, color, count) {
    const scene = this.scene;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.Between(30, 80);
      const vx    = Math.cos(angle) * speed;
      const vy    = Math.sin(angle) * speed;
      const sp    = scene.add.rectangle(x, y, 4, 4, color).setDepth(20);
      let life    = 0;
      const ev    = scene.time.addEvent({
        delay: 16, repeat: 30,
        callback: () => {
          life += 16;
          sp.x += vx * 0.016;
          sp.y += vy * 0.016;
          sp.setAlpha(1 - life / 500);
          if (life >= 480) { sp.destroy(); ev.remove(); }
        },
      });
    }
  }
}
