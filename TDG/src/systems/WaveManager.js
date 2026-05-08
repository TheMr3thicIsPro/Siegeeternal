// ============================================================
// WaveManager — day/night cycle, wave spawning, boss logic
// ============================================================
import {
  DAY_DUR, NIGHT_DUR, BASE_WAVE_SIZE,
  BOSS_CYCLE,
  DAY_ENEMIES, NIGHT_ENEMIES,
  ENEMY_UNLOCK_WAVE,
} from '../constants.js';
import { soundMgr } from './SoundManager.js';

export class WaveManager {
  constructor(scene) {
    this.scene              = scene;
    this.isDay              = true;
    this.phaseTime          = 0;
    this.phaseLen           = DAY_DUR;
    this.waveEnemiesLeft    = 0;
    this.waveActive         = false;
    this.suppressTransitions = false;
    this.isBountyRound      = false;
    this.bountyEnemyKey     = null;
    this._dayEclipseTimer   = 0;
  }

  startDay() {
    this.isDay      = true;
    this.phaseTime  = 0;
    this.phaseLen   = DAY_DUR;
    this.waveActive = false;

    this.scene.enemyMgr?.burnNightEnemies?.();
    if (this.scene.nightOverlay) this.scene.nightOverlay.setAlpha(0);
    this.scene.towerMgr?.updateTowerActiveState?.();
    this.scene.mutationSys?.clear?.();   // clear mutation at dawn

    // Solar eclipse lingers into the day — weather clears at NEXT night
    // All other weather types clear at dawn
    if (this.scene.weatherSystem?.current !== 'solar_eclipse') {
      this.scene.weatherSystem?.clear?.();
    } else {
      // Reset eclipse day-spawn timer so it fires shortly after dawn
      this._dayEclipseTimer = 8000;
    }

    this.scene.hud?.showMsg(`Day ${this.scene.wave} — build and gather!`, 4000);
    soundMgr.dayStart();

    // Achievement / contract tracking
    const w = this.scene.wave;
    this.scene.contractSys?.progress('waves', 1);
    this.scene.contractSys?.progress('night_survived', 1);
    if (w >= 1)   this.scene.events?.emit('achievement_check', 'wave_1');
    if (w >= 10)  this.scene.events?.emit('achievement_check', 'wave_10');
    if (w >= 25)  this.scene.events?.emit('achievement_check', 'wave_25');
    if (w >= 50)  this.scene.events?.emit('achievement_check', 'wave_50');
    if (w >= 100) this.scene.events?.emit('achievement_check', 'wave_100');

    // Reset all chests every day so players can re-loot each cycle
    if (this.scene.wave > 0) {
      this._resetChests();
    }

    // Regen some resources every 3 waves
    if (this.scene.wave > 0 && this.scene.wave % 3 === 0) {
      this._regenResources();
    }

    this.scene.saveGame?.();

    // Offer a perk every 5 waves at dawn
    if (this.scene.wave > 0 && this.scene.wave % 5 === 0) {
      this.scene.time.delayedCall(1500, () => {
        if (this.scene.alive) this.scene.perkSys?.offer();
      });
    }
  }

  startNight() {
    this.isDay     = false;
    this.phaseTime = 0;
    this.phaseLen  = NIGHT_DUR;
    this.scene.wave++;

    // Progressive wave scaling: +10% HP/SPD/count per 5 waves
    const _wStep = Math.max(0, Math.floor((this.scene.wave - 1) / 5));
    this.scene.waveScaleHpSpd = 1 + _wStep * 0.10;
    if (_wStep > 0 && this.scene.wave % 5 === 1) {
      this.scene.time.delayedCall(2200, () => {
        if (this.scene.alive)
          this.scene.hud?.showMsg(`⚡ Enemies are ${_wStep * 10}% stronger this wave!`, 4000);
      });
    }

    // Clear any lingering solar eclipse and roll new weather
    this.scene.weatherSystem?.clear?.();
    this.scene.weatherSystem?.roll?.();

    // Roll mutation for this wave (28% chance, wave 2+)
    this.scene.mutationSys?.rollMutation(this.scene.wave);

    // Bounty round: 20% chance on wave 10+
    this.isBountyRound  = false;
    this.bountyEnemyKey = null;
    if (this.scene.wave >= 10 && Math.random() < 0.20) {
      const pool = this._getEligiblePool(this.scene.wave);
      if (pool.length) {
        this.isBountyRound  = true;
        this.bountyEnemyKey = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    this.scene.towerMgr?.updateTowerActiveState?.();

    const weather = this.scene.weatherSystem;
    let wLabel = this.isBountyRound
      ? `BOUNTY NIGHT — ${this.bountyEnemyKey} only! 2× drops!`
      : `Night falls — Wave ${this.scene.wave} incoming!`;
    if (weather?.current) wLabel += `  [${weather.label()}]`;
    this.scene.hud?.showMsg(wLabel, 4000);
    if (weather?.current) {
      this.scene.time.delayedCall(4200, () => {
        if (this.scene.alive) this.scene.hud?.showMsg(`⚠ ${weather.effectDesc()}`, 5000);
      });
    }
    soundMgr.nightStart();
    this.scene.cameras?.main?.shake(300, 0.004);

    // Spawn mini objective a few seconds into night
    this.scene.time.delayedCall(4000, () => {
      if (this.scene.alive) this.scene.miniObjSys?.maybeSpawn(this.scene.wave);
    });

    // 10% chance each night (wave 3+) to trigger a raid event
    this.scene.time.delayedCall(6000, () => {
      if (this.scene.alive) this.scene.raiderSys?.maybeStartRaid(this.scene.wave);
    });

    // 20% chance each night to spawn a merchant NPC
    this.scene.time.delayedCall(8000, () => {
      if (this.scene.alive) this.scene.merchantSys?.maybeSpawn(this.scene.wave);
    });

    // Relentless challenge: keep spawning enemies throughout the night
    if (this.scene.challengeMods?.relentless) {
      this._relentlessTimer = 12000;
    }

    this.scene.time.delayedCall(2000, () => {
      if (this.scene.alive) this._spawnWave();
    });
  }

  update(delta) {
    // Sleep multiplier — 1.75× in both normal and hardcore
    const sleepMult = this.scene.sleeping ? 2.0 : 1;
    this.phaseTime += delta * sleepMult;

    // Weather particle update
    this.scene.weatherSystem?.update?.(delta);

    // Night overlay alpha
    if (this.scene.nightOverlay) {
      const pct = this.phaseTime / this.phaseLen;
      this.scene.nightOverlay.setAlpha(
        this.isDay
          ? Math.max(0, (1 - pct) * 0.55)
          : Math.min(0.55, pct * 0.55)
      );
    }

    if (this.suppressTransitions) return;

    // Relentless challenge mod: extra spawns every 12s at night
    if (!this.isDay && this.scene.challengeMods?.relentless && this._relentlessTimer !== undefined) {
      this._relentlessTimer -= delta;
      if (this._relentlessTimer <= 0) {
        this._relentlessTimer = 12000;
        const pool = this._getEligiblePool(this.scene.wave);
        const n = 3 + Math.floor(this.scene.wave / 5);
        for (let i = 0; i < n; i++) {
          this.scene.time.delayedCall(i * 600, () => {
            if (!this.scene.alive || this.isDay) return;
            this.scene.enemyMgr.spawnAtEdge(pool[Math.floor(Math.random() * pool.length)]);
            this.waveEnemiesLeft++;
          });
        }
      }
    }

    // Solar eclipse: trickle-spawn enemies during the day
    if (this.isDay && this.scene.weatherSystem?.spawnsDuringDay?.()) {
      this._dayEclipseTimer -= delta;
      if (this._dayEclipseTimer <= 0) {
        this._dayEclipseTimer = 15000; // every 15 s
        if (this.scene.alive && this.scene.wave > 0) {
          this.scene.hud?.showMsg('⚠ Eclipse — enemies emerge from the shadow!', 3000);
          const pool = this._getEligiblePool(this.scene.wave);
          const n    = Phaser.Math.Between(3, 5);
          for (let i = 0; i < n; i++) {
            this.scene.time.delayedCall(i * 400, () => {
              if (!this.scene.alive) return;
              const key = pool[Math.floor(Math.random() * pool.length)];
              this.scene.enemyMgr.spawnAtEdge(key);
            });
          }
        }
      }
    } else if (this.isDay) {
      this._dayEclipseTimer = 0; // reset when no eclipse
    }

    if (this.phaseTime >= this.phaseLen) {
      if (this.isDay) this.startNight();
      else            this.startDay();
    }
  }

  // Called from CaveScene on exit to fast-forward time while underground
  advanceTime(ms) {
    this.phaseTime += ms;
    if (this.phaseTime >= this.phaseLen && !this.suppressTransitions) {
      if (this.isDay) this.startNight();
      else            this.startDay();
    }
  }

  _getEligiblePool(wave) {
    const unlocked  = (key) => wave >= (ENEMY_UNLOCK_WAVE[key] ?? 1);
    const dayPool   = DAY_ENEMIES.filter(unlocked);
    const nightPool = NIGHT_ENEMIES.filter(unlocked);
    return [...(dayPool.length ? dayPool : ['shambler']), ...nightPool];
  }

  _spawnWave() {
    const wave = this.scene.wave;
    const pool = this.isBountyRound && this.bountyEnemyKey
      ? [this.bountyEnemyKey]
      : this._getEligiblePool(wave);

    // Apply weather count multiplier, boss-kill escalation, and progressive wave scaling
    const weatherCountMult = this.scene.weatherSystem?.enemyCountMult?.() ?? 1;
    const bossCountMult    = this.scene.bossBuff?.countMult ?? 1;
    const waveCountMult    = this.scene.waveScaleHpSpd ?? 1;
    const baseCount        = BASE_WAVE_SIZE + (wave - 1) * 2;
    const count            = Math.round(baseCount * weatherCountMult * bossCountMult * waveCountMult);

    const isBossWave = wave % 10 === 0 && wave > 0;

    this.waveEnemiesLeft = count + (isBossWave ? 1 : 0);
    this.waveActive      = true;

    for (let i = 0; i < count; i++) {
      const delay = i * 300 + Phaser.Math.Between(0, 400);
      this.scene.time.delayedCall(delay, () => {
        if (!this.scene.alive) return;
        const key = pool[Math.floor(Math.random() * pool.length)];
        this.scene.enemyMgr.spawnAtEdge(key);
      });
    }

    if (isBossWave) {
      const bossKey = this._getBossForWave(wave);
      if (bossKey) {
        this.scene.time.delayedCall(count * 300 + 2000, () => {
          if (!this.scene.alive) return;
          this.scene.enemyMgr.spawnBossAtSafeEdge(bossKey);
          this.scene.hud?.showMsg('⚠ BOSS INCOMING!', 3000);
          soundMgr.bossAlert();
          this.scene.cameras?.main?.shake(500, 0.005);
        });
      } else {
        this.waveEnemiesLeft--;
      }
    }
  }

  /**
   * Normal mode:
   *   Waves 10, 20       → pale_mother
   *   Waves 30, 40       → siege_hulk first (then alternates)
   *   Wave  50           → ironclad first appearance
   *   Wave  60+          → full cycle: pale_mother → siege_hulk → ironclad → …
   *
   * Hardcore mode:
   *   Strict rotation every 10 waves from the start:
   *   10=pale_mother, 20=siege_hulk, 30=ironclad, 40=pale_mother, …
   */
  _getBossForWave(wave) {
    if (this.scene.isHardcore) {
      const idx = Math.floor(wave / 10) - 1;
      return BOSS_CYCLE[idx % BOSS_CYCLE.length];
    }

    // Normal mode — staged introduction
    if (wave < 30) return 'pale_mother';                           // waves 10, 20

    if (wave < 50) {                                               // waves 30, 40
      const arr  = ['siege_hulk', 'pale_mother'];
      const slot = Math.floor((wave - 30) / 10);                  // 30→0, 40→1
      return arr[slot % 2];
    }

    if (wave < 60) return 'ironclad';                             // wave 50

    // wave 60+: cycle all three starting from pale_mother
    const slot = Math.floor((wave - 60) / 10);                    // 60→0, 70→1, …
    return BOSS_CYCLE[slot % BOSS_CYCLE.length];
  }

  onWaveCleared() {
    this.waveActive = false;
    this.scene.miniObjSys?.onWaveCleared();
    this.scene.raiderSys?.onWaveEnd?.();
    this.scene.merchantSys?.onWaveCleared?.();
  }

  _resetChests() {
    const scene = this.scene;
    if (!scene.chests?.length) return;
    const CHEST_TEX = {
      regular: 'chest_locked', boss: 'chest_locked', starter: 'chest_locked',
      cursed: 'chest_cursed', trap: 'chest_trap',
      legendary: 'chest_legendary', blueprint: 'chest_blueprint',
    };
    let count = 0;
    for (const chest of scene.chests) {
      if (!chest.isOpen) continue;
      if (chest.type === 'starter') continue;   // starter chest is one-time only
      chest.isOpen = false;
      const tex = CHEST_TEX[chest.type] ?? 'chest_locked';
      chest.sprite?.setTexture(tex).setAlpha(1);
      if (chest.label?.active) chest.label.setAlpha(0.6);
      count++;
    }
    if (count > 0) {
      scene.hud?.showMsg(`Chests have respawned! (${count} reset)`, 4000);
    }
  }

  serialize() {
    return { isDay: this.isDay, phaseTime: this.phaseTime, phaseLen: this.phaseLen };
  }

  restore(phase) {
    this.isDay     = phase.isDay    ?? true;
    this.phaseTime = phase.phaseTime ?? 0;
    this.phaseLen  = phase.isDay ? DAY_DUR : NIGHT_DUR;
    if (!phase.isDay) {
      this.scene.time.delayedCall(3000, () => {
        if (this.scene.alive) this._spawnWave();
      });
    }
  }

  _regenResources() {
    const inv = this.scene.inventory;
    if (!inv) return;
    inv.wood  = (inv.wood  || 0) + 15;
    inv.stone = (inv.stone || 0) + 10;
    inv.bone  = (inv.bone  || 0) + 5;
    inv.coal  = (inv.coal  || 0) + 3;
    this.scene.hud?.showMsg('Resources replenished! (+15 wood +10 stone +5 bone +3 coal)', 3500);
  }
}
