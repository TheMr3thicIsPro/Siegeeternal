// ============================================================
// MiniObjectiveSystem — supply drops and elite kills at night
// ============================================================
import { VW, VH, MW, MH, TS, ENEMY_DEFS, ENEMY_UNLOCK_WAVE } from '../constants.js';

const SPAWN_CHANCE      = 0.65;
const SPAWN_MIN_WAVE    = 3;

const OBJ_TYPE = {
  SUPPLY_DROP: 'supply_drop',
  ELITE_KILL:  'elite_kill',
};

const SUPPLY_REWARD = { wood: 15, stone: 10, iron: 8, coal: 8, bone: 12, souls: 5 };
const ELITE_REWARD  = { crystal: 3, iron: 10, gold: 8, bone: 15, souls: 8 };

const SUPPLY_HP_MAX  = 200;
const SUPPLY_TIMER_S = 60;
const ELITE_TIMER_S  = 90;

const HP_BAR_W = 40;
const HP_BAR_H = 4;

// Panel dimensions for the HUD overlay
const PANEL_W = 270;
const PANEL_H = 70;
const PANEL_X = 10;
const PANEL_Y = VH - 100;

export class MiniObjectiveSystem {
  constructor(scene) {
    this.scene = scene;

    // Active objective state (null = no active objective)
    this._obj = null;

    // UI elements
    this._uiPanel      = null;
    this._uiTitle      = null;
    this._uiDesc       = null;
    this._uiTimer      = null;
    this._uiBorder     = null;
    this._glowTween    = null;

    // HP bar for supply drop
    this._hpBarBg   = null;
    this._hpBarFill = null;

    // Floating label for elite
    this._eliteLabel = null;
  }

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Called from WaveManager.startNight().
   * Rolls and potentially spawns an objective for this wave.
   * @param {number} wave - current wave number
   */
  maybeSpawn(wave) {
    if (wave < SPAWN_MIN_WAVE) return;
    if (this._obj)              return; // one at a time

    if (Math.random() > SPAWN_CHANCE) return;

    // Randomly pick objective type
    if (Math.random() < 0.5) {
      this._spawnSupplyDrop();
    } else {
      this._spawnElite(wave);
    }
  }

  /**
   * Called each frame from GameScene.update().
   * @param {number} delta - ms elapsed since last frame
   */
  update(delta) {
    if (!this._obj) return;

    const obj = this._obj;

    // Tick countdown
    obj.timeLeft -= delta * 0.001;

    if (obj.timeLeft <= 0) {
      this._fail();
      return;
    }

    if (obj.type === OBJ_TYPE.SUPPLY_DROP) {
      this._updateSupplyDrop(delta);
    } else if (obj.type === OBJ_TYPE.ELITE_KILL) {
      this._updateEliteKill();
    }

    // Update the HUD panel each frame
    this._updateUI(obj);
  }

  /**
   * Called from WaveManager.onWaveCleared().
   * Supply drop succeeds if the crate is still alive when the wave ends.
   */
  onWaveCleared() {
    if (!this._obj) return;
    if (this._obj.type === OBJ_TYPE.SUPPLY_DROP && this._obj.hp > 0) {
      this._succeed();
    }
  }

  // ----------------------------------------------------------------
  // Objective — Supply Drop
  // ----------------------------------------------------------------

  _spawnSupplyDrop() {
    const scene = this.scene;

    // Place near world center with ±4 tile random offset
    const centerX = (MW / 2) * TS;
    const centerY = (MH / 2) * TS;
    const ox = Phaser.Math.Between(-4, 4) * TS;
    const oy = Phaser.Math.Between(-4, 4) * TS;
    const wx = centerX + ox;
    const wy = centerY + oy;

    // Crate sprite
    const sprite = scene.add.sprite(wx, wy, 'supply_crate').setDepth(8);

    // Glowing yellow ring (circle outline drawn via graphics)
    const sz = sprite.width ?? 32;
    const ringRadius = (sz * 0.5) + 8;
    const glow = scene.add.graphics();
    glow.lineStyle(3, 0xFFDD00, 1);
    glow.strokeCircle(wx, wy, ringRadius);
    glow.setDepth(7);

    this._glowTween = scene.tweens.add({
      targets:    glow,
      alpha:      { from: 0.2, to: 0.8 },
      duration:   600,
      yoyo:       true,
      repeat:     -1,
      ease:       'Sine.easeInOut',
    });

    // HP bar — background
    const barX = wx - HP_BAR_W / 2;
    const barY = wy - (sz * 0.5) - 10;
    this._hpBarBg   = scene.add.rectangle(barX, barY, HP_BAR_W, HP_BAR_H, 0x330000).setOrigin(0, 0).setDepth(11);
    this._hpBarFill = scene.add.rectangle(barX, barY, HP_BAR_W, HP_BAR_H, 0x00CC44).setOrigin(0, 0).setDepth(12);

    this._obj = {
      type:     OBJ_TYPE.SUPPLY_DROP,
      sprite,
      glow,
      hp:       SUPPLY_HP_MAX,
      maxHp:    SUPPLY_HP_MAX,
      wx,
      wy,
      sz,
      timeLeft: SUPPLY_TIMER_S,
    };

    this._buildUI('>> SUPPLY DROP', 'Defend the crate until dawn!', 0x22AAFF);
    scene.hud?.showMsg('!! Supply crate incoming — protect it!', 4000);
    scene.cameras?.main?.flash(300, 0, 180, 60);
  }

  _updateSupplyDrop(delta) {
    const obj     = this._obj;
    const scene   = this.scene;
    const enemies = scene.enemyMgr?.enemies ?? [];

    // Enemies within 28px of the crate damage it each frame
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const sp = enemy.sprite;
      if (!sp) continue;
      const dx = sp.x - obj.wx;
      const dy = sp.y - obj.wy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 28) {
        const dmgPerSec = (enemy.def?.dmg ?? 10) * 2;
        obj.hp -= dmgPerSec * delta * 0.001;
      }
    }

    if (obj.hp <= 0) {
      obj.hp = 0;
      this._fail();
      return;
    }

    // Sync HP bar width and color
    const pct = obj.hp / obj.maxHp;
    this._hpBarFill?.setDisplaySize(HP_BAR_W * pct, HP_BAR_H);

    let barColor;
    if (pct > 0.6)       barColor = 0x00CC44;
    else if (pct > 0.3)  barColor = 0xFFCC00;
    else                 barColor = 0xDD2200;
    this._hpBarFill?.setFillStyle(barColor);
  }

  // ----------------------------------------------------------------
  // Objective — Elite Kill
  // ----------------------------------------------------------------

  _spawnElite(wave) {
    const scene = this.scene;

    // Pick a random non-boss enemy available at this wave
    const eligible = Object.entries(ENEMY_UNLOCK_WAVE)
      .filter(([, unlockWave]) => wave >= unlockWave)
      .map(([key]) => key);

    if (!eligible.length) return;

    const key      = eligible[Phaser.Math.Between(0, eligible.length - 1)];
    const baseDef  = ENEMY_DEFS[key];
    if (!baseDef) return;

    // Build overridden definition — 50% stronger than before (4.5× HP, 3× dmg, 2.25× spd)
    const overrideDef = Object.assign({}, baseDef, {
      hp:  Math.ceil(baseDef.hp  * 4.5),
      dmg: Math.ceil(baseDef.dmg * 3),
      spd: baseDef.spd * 2.25,
      sz:  Math.ceil(baseDef.sz  * 1.4),
    });

    // Spawn via EnemyManager.spawnAt near map center
    const centerX = (MW / 2) * TS + Phaser.Math.Between(-3, 3) * TS;
    const centerY = (MH / 2) * TS + Phaser.Math.Between(-3, 3) * TS;
    scene.enemyMgr?.spawnAt(key, centerX, centerY, overrideDef);

    // Retrieve the just-spawned enemy (last in the array)
    const enemies = scene.enemyMgr?.enemies ?? [];
    const elite   = enemies[enemies.length - 1];
    if (!elite) return;

    // Gold tint
    elite.sprite?.setTint(0xFFAA00);

    // Floating "** ELITE **" label above the enemy
    const label = scene.add.text(
      elite.sprite?.x ?? centerX,
      (elite.sprite?.y ?? centerY) - (overrideDef.sz + 14),
      '** ELITE **',
      {
        fontSize:   '11px',
        fontFamily: 'monospace',
        color:      '#FFAA00',
        stroke:     '#000000',
        strokeThickness: 3,
      }
    ).setDepth(15).setOrigin(0.5, 1);
    this._eliteLabel = label;

    this._obj = {
      type:     OBJ_TYPE.ELITE_KILL,
      elite,
      key,
      timeLeft: ELITE_TIMER_S,
    };

    this._buildUI(
      '>> ELITE TARGET',
      `Slay the elite ${baseDef.name ?? key}!`,
      0xFF6600,
    );
    scene.hud?.showMsg(`!! Elite ${baseDef.name ?? key} spotted — take it down!`, 4000);
    scene.cameras?.main?.flash(300, 80, 30, 0);
  }

  _updateEliteKill() {
    const obj   = this._obj;
    const elite = obj.elite;

    // Follow elite sprite with the floating label
    if (this._eliteLabel && elite?.sprite) {
      this._eliteLabel.setPosition(
        elite.sprite.x,
        elite.sprite.y - (obj.elite?.def?.sz ?? 14) - 14,
      );
    }

    // Check kill condition
    if (elite && elite.alive === false) {
      this._succeed();
    }
  }

  // ----------------------------------------------------------------
  // Outcome handlers
  // ----------------------------------------------------------------

  _succeed() {
    const obj   = this._obj;
    const scene = this.scene;

    const reward = obj.type === OBJ_TYPE.SUPPLY_DROP ? SUPPLY_REWARD : ELITE_REWARD;

    // Add resources to inventory (immutable-style: add to existing values)
    if (scene.inventory) {
      for (const [res, amt] of Object.entries(reward)) {
        scene.inventory[res] = (scene.inventory[res] ?? 0) + amt;
      }
      // Supply crate: 25% chance to contain a Bridge Blueprint (per-run only)
      let bpMsg = '';
      if (obj.type === OBJ_TYPE.SUPPLY_DROP && Math.random() < 0.25) {
        scene.inventory.bridge_blueprint = (scene.inventory.bridge_blueprint ?? 0) + 1;
        bpMsg = '  + BRIDGE BLUEPRINT found!';
      }
      scene.hud?.showMsg(`!! Objective complete — reward granted!${bpMsg}`, 5000);
    } else {
      scene.hud?.showMsg('!! Objective complete — reward granted!', 5000);
    }
    scene.cameras?.main?.flash(400, 0, 200, 80);

    this._cleanup();
  }

  _fail() {
    const scene = this.scene;
    scene.hud?.showMsg('>> Objective failed.', 4000);
    scene.cameras?.main?.shake(250, 0.003);
    this._cleanup();
  }

  // ----------------------------------------------------------------
  // Cleanup
  // ----------------------------------------------------------------

  _cleanup() {
    const obj = this._obj;
    if (!obj) return;

    // Stop glow tween and destroy graphics
    this._glowTween?.stop();
    this._glowTween = null;
    obj.glow?.destroy();

    // Destroy supply-drop HP bar
    this._hpBarBg?.destroy();
    this._hpBarFill?.destroy();
    this._hpBarBg   = null;
    this._hpBarFill = null;

    // Destroy elite floating label
    this._eliteLabel?.destroy();
    this._eliteLabel = null;

    // Crate sprite
    obj.sprite?.destroy();

    this._destroyUI();
    this._obj = null;
  }

  // ----------------------------------------------------------------
  // HUD panel
  // ----------------------------------------------------------------

  /**
   * Build the bottom-left objective panel.
   * @param {string} title - short title line
   * @param {string} desc  - description line
   * @param {number} color - border/title hex color
   */
  _buildUI(title, desc, color) {
    this._destroyUI(); // ensure clean slate

    const scene = this.scene;

    // Panel background
    this._uiPanel = scene.add.rectangle(
      PANEL_X + PANEL_W / 2,
      PANEL_Y + PANEL_H / 2,
      PANEL_W, PANEL_H,
      0x000000, 0.72,
    ).setDepth(20).setScrollFactor(0);

    // Colored border (stroke rectangle via graphics)
    this._uiBorder = scene.add.graphics();
    this._uiBorder.lineStyle(2, color, 1);
    this._uiBorder.strokeRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H);
    this._uiBorder.setDepth(21).setScrollFactor(0);

    // Title text
    this._uiTitle = scene.add.text(
      PANEL_X + 8,
      PANEL_Y + 7,
      title,
      { fontSize: '12px', fontFamily: 'monospace', color: '#' + color.toString(16).padStart(6, '0'), fontStyle: 'bold' },
    ).setDepth(22).setScrollFactor(0);

    // Description text
    this._uiDesc = scene.add.text(
      PANEL_X + 8,
      PANEL_Y + 24,
      desc,
      { fontSize: '11px', fontFamily: 'monospace', color: '#CCCCCC' },
    ).setDepth(22).setScrollFactor(0);

    // Timer text
    this._uiTimer = scene.add.text(
      PANEL_X + 8,
      PANEL_Y + 42,
      '',
      { fontSize: '11px', fontFamily: 'monospace', color: '#44FF44' },
    ).setDepth(22).setScrollFactor(0);
  }

  /**
   * Update the HUD panel each frame.
   * @param {{ timeLeft: number, type: string, hp?: number, maxHp?: number }} obj
   */
  _updateUI(obj) {
    if (!this._uiTimer) return;

    const secs    = Math.max(0, Math.ceil(obj.timeLeft));
    const total   = obj.type === OBJ_TYPE.SUPPLY_DROP ? SUPPLY_TIMER_S : ELITE_TIMER_S;
    const timePct = obj.timeLeft / total;

    // Timer color: green -> yellow -> red
    let timerColor;
    if (timePct > 0.5)      timerColor = '#44FF44';
    else if (timePct > 0.25) timerColor = '#FFDD00';
    else                     timerColor = '#FF3333';

    this._uiTimer.setText(`Time: ${secs}s`).setColor(timerColor);

    // For supply drop, append HP info
    if (obj.type === OBJ_TYPE.SUPPLY_DROP && obj.hp !== undefined) {
      const hpPct = Math.round((obj.hp / obj.maxHp) * 100);
      this._uiTimer.setText(`Time: ${secs}s   Crate HP: ${hpPct}%`).setColor(timerColor);
    }
  }

  _destroyUI() {
    this._uiPanel?.destroy();
    this._uiBorder?.destroy();
    this._uiTitle?.destroy();
    this._uiDesc?.destroy();
    this._uiTimer?.destroy();

    this._uiPanel  = null;
    this._uiBorder = null;
    this._uiTitle  = null;
    this._uiDesc   = null;
    this._uiTimer  = null;
  }
}
