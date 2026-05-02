// ============================================================
// CaveScene — underground cave level
// Entered from GameScene via sleep/wake scene transition.
// ============================================================
import {
  TS, VW, VH,
  CAVE_W, CAVE_H,
  CAVE_RESOURCE_NODES,
  DAY_ENEMIES, NIGHT_ENEMIES,
  ENEMY_DEFS,
  INTERACT_RANGE, PLAYER_SPEED,
  PICKAXE_TIERS, ORE_TIER_REQ,
  HELMET_DEFS, PANTS_DEFS, SET_BOOTS_DEFS, SET_BONUS_DEFS,
} from '../constants.js';
import { pdist, valueNoise } from '../utils.js';
import { EnemyManager } from '../systems/EnemyManager.js';
import { soundMgr }    from '../systems/SoundManager.js';
import { TowerManager } from '../systems/TowerManager.js';
import { HUD }          from '../systems/HUD.js';

export class CaveScene extends Phaser.Scene {
  constructor() { super('Cave'); }

  // ============================================================
  // CREATE
  // ============================================================
  create() {
    // ── Shared state from registry ────────────────────────
    this.inventory   = this.registry.get('inventory');
    this.playerHP    = this.registry.get('playerHP')  ?? 100;
    this.playerMP    = this.registry.get('playerMP')  ?? 100;
    this.playerMaxHP = 100;
    this.playerMaxMP = 100;
    this._waveCount  = this.registry.get('wave')      ?? 1;
    this.wave        = this._waveCount;

    this.alive      = true;
    this.invincible = 0;
    this.lastDmgTime = 0;
    this.buildMode  = null;
    this._attackCooldown = 0;
    this._weaponCooldown = this.registry.get('weaponCooldown') ?? 400;
    this.hasPickaxe      = this.registry.get('hasPickaxe')     ?? false;
    this.pickaxeKey      = this.registry.get('pickaxeKey')     ?? null;
    this.hasSpeedBoots   = this.registry.get('hasSpeedBoots')  ?? false;
    this.weapon          = this.registry.get('weapon')         ?? null;
    this.armor           = this.registry.get('armor')          ?? null;
    this.helmet          = this.registry.get('helmet')         ?? null;
    this.pants           = this.registry.get('pants')          ?? null;
    this.setBoots        = this.registry.get('setBoots')       ?? null;
    this.playerArmor     = this.registry.get('playerArmor')     ?? 0;
    this.playerAttackDmg = this.registry.get('playerAttackDmg') ?? 10;
    this.sellMode   = false;
    this._paused    = false;
    this._pauseMenu = null;
    this.hasRevive    = this.registry.get('hasRevive')  ?? false;
    this.hasTorch     = this.registry.get('hasTorch')   ?? false;
    this.isHardcore   = this.registry.get('isHardcore') ?? false;
    this.mapData      = [];
    this._harvestBusy = false;
    this._caveTimeAccum = 0;  // tracks real ms spent in cave for overworld day/night sync
    this._deepCaveTransitioning = false;

    // Real waveMgr reference for time sync on exit
    this._realWaveMgr = this.registry.get('waveMgrRef') ?? null;

    // Stub waveMgr so EnemyManager / HUD don't crash
    this.waveMgr = {
      isDay: false,
      phaseTime: 0,
      phaseLen: 999999,
      waveEnemiesLeft: 0,
      waveActive: false,
      onWaveCleared() {},
    };

    // ── Build cave ────────────────────────────────────────
    this._generateCave();
    this._createPlayer();
    this._applyArmorTint(this.armor);   // restore visual after player is built

    // Dark ambient overlay — caves are always dark
    this.nightOverlay = this.add
      .rectangle(VW / 2, VH / 2, VW, VH, 0x050308, 0.55)
      .setScrollFactor(0)
      .setDepth(30);

    // ── Systems ───────────────────────────────────────────
    this.towerMgr = new TowerManager(this);
    this.enemyMgr = new EnemyManager(this);
    this.hud      = new HUD(this);
    this.hud.build();

    // ── Camera ────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, CAVE_W * TS, CAVE_H * TS);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.physics.world.setBounds(TS, TS, (CAVE_W - 2) * TS, (CAVE_H - 2) * TS);

    // ── Input ─────────────────────────────────────────────
    this._setupInput();
    this._setupGamepad();

    // ── Continuous enemy spawning ─────────────────────────
    this._scheduleEnemySpawns();

    // ── Handle return from deep cave ──────────────────────
    this.events.on('wake', () => {
      this._deepCaveTransitioning = false;
      const hp      = this.registry.get('playerHP');
      const mp      = this.registry.get('playerMP');
      const rev     = this.registry.get('hasRevive');
      const torch   = this.registry.get('hasTorch');
      const helmet  = this.registry.get('helmet');
      const pants   = this.registry.get('pants');
      const boots   = this.registry.get('setBoots');
      if (hp     !== undefined) this.playerHP  = hp;
      if (mp     !== undefined) this.playerMP  = mp;
      if (rev    !== undefined) this.hasRevive = rev;
      if (torch  !== undefined) this.hasTorch  = torch;
      if (helmet !== undefined) this.helmet    = helmet;
      if (pants  !== undefined) this.pants     = pants;
      if (boots  !== undefined) this.setBoots  = boots;
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.hud.showMsg('You emerge from the deep cave.', 2000);
    });

    this.hud.showMsg('Cave — press E near exit (top) or deep cave entrance (bottom) to interact.', 5000);
  }

  // ============================================================
  // UPDATE
  // ============================================================
  update(time, delta) {
    if (!this.alive || this._paused) return;

    this._caveTimeAccum += delta;
    this._updatePlayer(delta, time);
    this._updateGamepad();
    this._checkDeepCaveEntry();
    this.enemyMgr.update(delta, time);
    this.towerMgr.updateTowers(time);
    this.towerMgr.updateProjectiles(delta);
    this.towerMgr.updateMachines(delta);
    this.hud.update();

    if (this.invincible > 0) this.invincible -= delta;
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
    // Slow mana regen
    this.playerMP = Math.min(this.playerMaxMP, this.playerMP + delta * 0.01);
  }

  // ============================================================
  // CAVE GENERATION
  // ============================================================
  _generateCave() {
    // Init mapData grid
    for (let y = 0; y < CAVE_H; y++) {
      this.mapData[y] = [];
      for (let x = 0; x < CAVE_W; x++) {
        const isBorder = x === 0 || y === 0 || x === CAVE_W - 1 || y === CAVE_H - 1;
        this.mapData[y][x] = {
          terrain: isBorder ? 'bwall' : 'cave_floor',
          resource: null,
          structure: null,
        };
      }
    }

    for (let y = 0; y < CAVE_H; y++) {
      for (let x = 0; x < CAVE_W; x++) {
        const tex = this.mapData[y][x].terrain === 'bwall' ? 'bwall' : 'cave_floor';
        this.add.image(x * TS + TS / 2, y * TS + TS / 2, tex).setDepth(-10);
      }
    }

    // ── Resource nodes ────────────────────────────────────
    const totalNodes = 18;
    for (let i = 0; i < totalNodes; i++) {
      let attempts = 0;
      let placed = false;

      while (!placed && attempts < 50) {
        attempts++;
        const rx = Phaser.Math.Between(2, CAVE_W - 3);
        const ry = Phaser.Math.Between(2, CAVE_H - 3);

        if (this.mapData[ry][rx].resource) continue;

        // Pick node type by cumulative weight
        const roll = Math.random();
        let cumulative = 0;
        let chosenNode = null;
        for (const nt of CAVE_RESOURCE_NODES) {
          cumulative += nt.w;
          if (roll < cumulative) { chosenNode = nt; break; }
        }
        if (!chosenNode) chosenNode = CAVE_RESOURCE_NODES[CAVE_RESOURCE_NODES.length - 1];

        const range  = chosenNode.amt[1] - chosenNode.amt[0] + 1;
        const amount = chosenNode.amt[0] + Math.floor(Math.random() * range);
        const sprite = this.add
          .sprite(rx * TS + TS / 2, ry * TS + TS / 2, chosenNode.key)
          .setDepth(2);

        this.mapData[ry][rx].resource = {
          type:        chosenNode.res,
          amt:         amount,
          maxAmt:      amount,
          sprite,
          tileX:       rx,
          tileY:       ry,
          respawnTimer: 0,
        };
        placed = true;
      }
    }

    // ── Deep cave entrance (bottom-center) ────────────────
    const dcEntX = Math.floor(CAVE_W / 2);
    const dcEntY = CAVE_H - 4;
    this.mapData[dcEntY][dcEntX].isDeepCaveEntry = true;
    this.deepCaveEntryTile = { x: dcEntX, y: dcEntY };
    this.add.sprite(dcEntX * TS + TS / 2, dcEntY * TS + TS / 2, 'cave_entrance')
      .setDepth(2).setTint(0x9955FF);
    const dcLabel = this.add.text(
      dcEntX * TS + TS / 2, dcEntY * TS - 10,
      'DEEP CAVE  [E]',
      { fontSize: '10px', color: '#CC88FF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5, 1).setDepth(3);
    this.tweens.add({ targets: dcLabel, alpha: { from: 0.4, to: 1 }, duration: 1100, yoyo: true, repeat: -1 });

    // ── Cave exit (top-center) ─────────────────────────────
    const exitX = Math.floor(CAVE_W / 2);
    const exitY = 2;

    this.mapData[exitY][exitX].isCaveExit = true;
    this.caveExitTile = { x: exitX, y: exitY };

    this.add
      .sprite(exitX * TS + TS / 2, exitY * TS + TS / 2, 'cave_entrance')
      .setDepth(2);

    // Pulsing "EXIT" label above the exit sprite
    const exitLabel = this.add.text(
      exitX * TS + TS / 2,
      exitY * TS - 10,
      'EXIT',
      { fontSize: '11px', color: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5, 1).setDepth(3);

    this.tweens.add({
      targets:    exitLabel,
      alpha:      { from: 0.5, to: 1 },
      duration:   800,
      yoyo:       true,
      repeat:     -1,
      ease:       'Sine.easeInOut',
    });
  }

  // ============================================================
  // PLAYER
  // ============================================================
  _createPlayer() {
    const cx = Math.floor(CAVE_W / 2) * TS + TS / 2;
    const cy = Math.floor(CAVE_H / 2) * TS + TS / 2;
    this.player = this.add.sprite(cx, cy, 'player').setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(20, 20).setCollideWorldBounds(true);
  }

  _updatePlayer(delta, time) {
    const keys = this._keys;
    const spd  = PLAYER_SPEED * this._getCaveSpeedMult();
    let vx = 0, vy = 0;

    if (keys.left.isDown)  vx -= spd;
    if (keys.right.isDown) vx += spd;
    if (keys.up.isDown)    vy -= spd;
    if (keys.down.isDown)  vy += spd;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    this.player.body.setVelocity(vx, vy);

    if (Phaser.Input.Keyboard.JustDown(keys.interact)) {
      // Check exit first, then deep cave entry, then harvest
      const ex = this.caveExitTile.x * TS + TS / 2;
      const ey = this.caveExitTile.y * TS + TS / 2;
      const distToExit = pdist({ x: this.player.x, y: this.player.y }, { x: ex, y: ey });

      const dcx = this.deepCaveEntryTile.x * TS + TS / 2;
      const dcy = this.deepCaveEntryTile.y * TS + TS / 2;
      const distToDC = pdist({ x: this.player.x, y: this.player.y }, { x: dcx, y: dcy });

      if (distToExit <= INTERACT_RANGE) {
        this._exitCave();
      } else if (distToDC <= INTERACT_RANGE) {
        this._startDeepCaveTransition();
      } else {
        this._tryHarvest();
      }
    }
    if (Phaser.Input.Keyboard.JustDown(this._keys.attack)) this._tryAttack();
  }

  _updateGamepad() {
    const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
    let raw = null;
    for (let i = 0; i < rawPads.length; i++) { if (rawPads[i] && rawPads[i].connected) { raw = rawPads[i]; break; } }
    if (!raw) return;

    if (!this._gpDetected) {
      this._gpDetected = true;
      this.hud?.showMsg('Controller ready!', 2000);
    }

    const prev = this._gpPrev;
    const DEAD = 0.15;

    // Left Stick — Movement
    const lsx = +raw.axes[0] || 0;
    const lsy = +raw.axes[1] || 0;
    if (Math.abs(lsx) > DEAD || Math.abs(lsy) > DEAD) {
      const gpSpd = PLAYER_SPEED * this._getCaveSpeedMult();
      let vx = Math.abs(lsx) > DEAD ? lsx * gpSpd : 0;
      let vy = Math.abs(lsy) > DEAD ? lsy * gpSpd : 0;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      this.player.body.setVelocity(vx, vy);
    }

    const just = (i) => {
      const cur = raw.buttons[i]?.pressed ?? false;
      const was = prev[i] ?? false;
      prev[i] = cur;
      return cur && !was;
    };

    if (just(0)) {
      const ex = this.caveExitTile.x * TS + TS / 2;
      const ey = this.caveExitTile.y * TS + TS / 2;
      const exitDist = pdist({ x: this.player.x, y: this.player.y }, { x: ex, y: ey });

      const dcx = this.deepCaveEntryTile.x * TS + TS / 2;
      const dcy = this.deepCaveEntryTile.y * TS + TS / 2;
      const dcDist = pdist({ x: this.player.x, y: this.player.y }, { x: dcx, y: dcy });

      if (exitDist <= INTERACT_RANGE) {
        this._exitCave();
      } else if (dcDist <= INTERACT_RANGE) {
        this._startDeepCaveTransition();
      } else if (exitDist <= INTERACT_RANGE * 2.5) {
        this.hud.showMsg('Move closer to the EXIT glyph — then press A / E', 1500);
      } else {
        this._tryHarvest();
      }
    }
    if (just(2)) { this._tryAttack(); }
    if (just(1)) { if (this.hud.isCraftOpen()) this.hud.closeCraft(); else this.hud.openCraft(); }
    if (just(3)) { this._toggleSellMode(); }
    if (just(9)) { this._togglePause(); }

    if (this.hud.isCraftOpen()) {
      if (just(12))          { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 4); this.hud._selectSlot?.(this._gamepadMenuIdx); }
      if (just(13))          { this._gamepadMenuIdx = Math.min(11, this._gamepadMenuIdx + 4); this.hud._selectSlot?.(this._gamepadMenuIdx); }
      if (just(14)||just(4)) { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 1); this.hud._selectSlot?.(this._gamepadMenuIdx); }
      if (just(15)||just(5)) { this._gamepadMenuIdx = Math.min(11, this._gamepadMenuIdx + 1); this.hud._selectSlot?.(this._gamepadMenuIdx); }
    }
  }

  _setupGamepad() {
    this._gpPrev         = {};
    this._gamepadMenuIdx = 0;
    this._gpDetected     = false;
    this.input.gamepad.on('connected', () => {
      this.hud?.showMsg('Controller connected!', 2000);
      this._gpDetected = true;
    });
  }

  // ============================================================
  // INPUT SETUP
  // ============================================================
  _setupInput() {
    this._keys = {
      up:       this.input.keyboard.addKey('W'),
      down:     this.input.keyboard.addKey('S'),
      left:     this.input.keyboard.addKey('A'),
      right:    this.input.keyboard.addKey('D'),
      interact: this.input.keyboard.addKey('E'),
    };
    this._keys.attack = this.input.keyboard.addKey('L');

    this.input.keyboard.on('keydown-F', () => {
      if (this.hud.isCraftOpen()) this.hud.closeCraft();
      else                        this.hud.openCraft();
    });

    this.input.keyboard.on('keydown-ESC', () => this._togglePause());

    this.input.on('pointerdown', (ptr) => {
      if (ptr.button === 0) this._tryAttack();
    });
  }

  // ============================================================
  // EXIT CAVE
  // ============================================================
  _exitCave() {
    // Sync overworld day/night cycle with time spent underground
    this._realWaveMgr?.advanceTime?.(this._caveTimeAccum);

    this.registry.set('playerHP',  this.playerHP);
    this.registry.set('playerMP',  this.playerMP);
    this.registry.set('hasRevive', this.hasRevive);
    this.registry.set('inventory', this.inventory);
    this.registry.set('hasTorch',  this.hasTorch ?? false);
    this.registry.set('helmet',    this.helmet   ?? null);
    this.registry.set('pants',     this.pants    ?? null);
    this.registry.set('setBoots',  this.setBoots ?? null);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.stop('Cave');
      this.scene.wake('Game');
    });
  }

  // ============================================================
  // HARVEST
  // ============================================================
  _tryHarvest() {
    if (this._harvestBusy) return;
    const px = this.player.x, py = this.player.y;
    let best = null, bestD = INTERACT_RANGE;

    for (let y = 0; y < CAVE_H; y++) {
      for (let x = 0; x < CAVE_W; x++) {
        const node = this.mapData[y]?.[x]?.resource;
        if (!node || node.amt <= 0) continue;
        const d = pdist({ x: x * TS + TS / 2, y: y * TS + TS / 2 }, { x: px, y: py });
        if (d < bestD) { bestD = d; best = node; }
      }
    }

    if (!best) return;
    const reqTier = ORE_TIER_REQ[best.type] ?? 0;
    const myTier  = PICKAXE_TIERS[this.pickaxeKey] ?? 0;
    if (reqTier > 0 && myTier < reqTier) {
      const tierNames = ['', 'Stone', 'Iron', 'Crystal'];
      this.hud.showMsg(`Need ${tierNames[reqTier] ?? 'better'} Pickaxe to mine ${best.type}! (Items tab)`, 2500);
      return;
    }

    this._harvestBusy = true;
    this._showMineAnim(best.sprite.x, best.sprite.y);
    soundMgr.mine();

    const isEmeraldPick = this.pickaxeKey === 'emerald_pick';
    const isRuby        = this.pickaxeKey === 'ruby_pick';
    const isEmeraldPants = this.pants === 'emerald_pants';
    // Emerald pants: -100ms mine time (stacks with ruby pick bonus)
    const mineDelay = (isRuby ? 700 : 800) - (isEmeraldPants ? 100 : 0);

    this.time.delayedCall(mineDelay, () => {
      this._harvestBusy = false;
      if (best.amt <= 0) return;
      let gain = Math.min(best.amt, Phaser.Math.Between(2, 4));
      if (isEmeraldPick) gain = Math.min(best.amt, Math.ceil(gain * 1.5));
      best.amt -= gain;
      this.inventory[best.type] = (this.inventory[best.type] || 0) + gain;
      this.enemyMgr.spawnParticles(best.sprite.x, best.sprite.y, 0xC8A96E, 4);
      if (best.amt <= 0) best.sprite.setVisible(false);
      this.hud.showMsg(`+${gain} ${best.type}`, 900);
    });
  }

  _showMineAnim(tx, ty) {
    const px = this.player.x, py = this.player.y;
    const angle = Math.atan2(ty - py, tx - px);
    this.player.setTint(0x88CCFF);
    this.time.delayedCall(800, () => { if (this.player.active) this.player.clearTint(); });
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0xC0A882);
    g.fillRect(0, -2, 22, 5);
    g.fillStyle(0x9A908A);
    g.fillTriangle(18, -5, 22, 2, 18, 3);
    g.setPosition(px + Math.cos(angle) * 16, py + Math.sin(angle) * 16);
    g.setRotation(angle);
    this.tweens.add({
      targets: g,
      rotation: angle + 1.1,
      alpha: 0,
      duration: 700,
      ease: 'Bounce.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  // ============================================================
  // ATTACK
  // ============================================================
  _tryAttack() {
    if (this._attackCooldown > 0) return;
    const baseD = this.playerAttackDmg || 0;
    if (baseD <= 0) {
      this.hud.showMsg('Craft a sword to attack! (Items tab)', 2000);
      return;
    }
    // Emerald full-set cave bonus: +25% dmg, 0.5 HP lifesteal per kill
    const armorSet    = this._getArmorSet();
    const caveMult    = armorSet === 'emerald' ? (SET_BONUS_DEFS.emerald?.caveDmgMult ?? 1.25) : 1;
    const lifesteal   = armorSet === 'emerald' ? (SET_BONUS_DEFS.emerald?.caveLifesteal ?? 0.5) : 0;
    const dmg         = Math.round(baseD * caveMult);

    const RANGE = 63;
    let hit = false;
    for (const enemy of this.enemyMgr.enemies) {
      if (!enemy.alive) continue;
      if (pdist({ x: this.player.x, y: this.player.y }, enemy.sprite) < RANGE) {
        const willKill = enemy.hp - dmg <= 0;
        enemy.hp -= dmg;
        if (willKill && lifesteal > 0) {
          this.playerHP = Math.min(this.playerMaxHP, this.playerHP + lifesteal);
        }
        if (enemy.sprite.active) {
          enemy.sprite.setTint(0xFFFFFF);
          this.time.delayedCall(80, () => { if (enemy.sprite?.active) enemy.sprite.clearTint(); });
        }
        hit = true;
      }
    }
    this._showSwordSwing();
    if (hit) {
      this._attackCooldown = this._weaponCooldown ?? 400;
      this.cameras.main.shake(60, 0.002);
      this.enemyMgr.spawnParticles(this.player.x, this.player.y, 0xFF4444, 3);
    }
  }

  _showSwordSwing() {
    const g = this.add.graphics().setDepth(20).setPosition(this.player.x, this.player.y);
    g.lineStyle(3, 0xFFFFCC, 0.9);
    g.beginPath();
    g.arc(0, 0, 30, -Math.PI * 0.5, Math.PI * 0.4, false);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => g.destroy() });
  }

  // ============================================================
  // PAUSE (simple stub — cave has no save/quit)
  // ============================================================
  _togglePause() {
    if (!this._pauseMenu) this._buildPauseMenu();
    this._paused = !this._paused;
    this._pauseMenu.forEach(i => i.setVisible(this._paused));
    if (this._paused) this.physics.pause();
    else              this.physics.resume();
  }

  _buildPauseMenu() {
    const cx = VW / 2, cy = VH / 2;
    const d = 100;
    const items = [];
    items.push(this.add.rectangle(cx, cy, VW, VH, 0x000000, 0.65).setScrollFactor(0).setDepth(d));
    items.push(this.add.text(cx, cy - 30, 'PAUSED', {
      fontSize: '22px', fill: '#EDE0C4', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 1));
    const b = this.add.text(cx, cy + 30, '[ RESUME ]', {
      fontSize: '15px', fill: '#C8A96E', fontFamily: 'monospace',
      backgroundColor: '#1A1210', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 1).setInteractive({ useHandCursor: true });
    b.on('pointerover', () => b.setStyle({ fill: '#FFE090' }));
    b.on('pointerout',  () => b.setStyle({ fill: '#C8A96E' }));
    b.on('pointerdown', () => this._togglePause());
    items.push(b);
    items.forEach(i => i.setVisible(false));
    this._pauseMenu = items;
  }

  // No sell mode in cave — stub to avoid crash from gamepad button 3
  _toggleSellMode() {}

  // Returns set name if all 4 armor slots share the same set, else null
  _getArmorSet() {
    if (!this.armor || !this.helmet || !this.pants || !this.setBoots) return null;
    const chestSet  = this.armor.replace('armor_', '');
    const helmetSet = HELMET_DEFS[this.helmet]?.set;
    const pantsSet  = PANTS_DEFS[this.pants]?.set;
    const bootsSet  = SET_BOOTS_DEFS[this.setBoots]?.set;
    if (chestSet === helmetSet && chestSet === pantsSet && chestSet === bootsSet) return chestSet;
    return null;
  }

  // Cave speed: speed boots > emerald boots (cave) > bone boots (always) > 1
  _getCaveSpeedMult() {
    if (this.hasSpeedBoots) return 1.30;
    if (!this.setBoots) return 1;
    const bd = SET_BOOTS_DEFS[this.setBoots];
    if (!bd) return 1;
    if (bd.caveSpdMult) return bd.caveSpdMult;   // emerald: +12% in caves
    return bd.spdMult ?? 1;                        // bone: +10% always
  }

  _applyArmorTint(armorKey) {
    const TINTS = {
      armor_bone:    0xF0E0C8,
      armor_iron:    0xC8D0D8,
      armor_crystal: 0x88DDD0,
      armor_ruby:    0xFF8899,
      armor_emerald: 0x88EE99,
    };
    const tint = TINTS[armorKey];
    if (tint) this.player?.setTint(tint);
    else       this.player?.clearTint();
  }

  // ============================================================
  // DEEP CAVE TRANSITION
  // ============================================================
  _checkDeepCaveEntry() {
    if (!this.deepCaveEntryTile || this._deepCaveTransitioning) return;
    const ex = this.deepCaveEntryTile.x * TS + TS / 2;
    const ey = this.deepCaveEntryTile.y * TS + TS / 2;
    const dist = pdist({ x: this.player.x, y: this.player.y }, { x: ex, y: ey });
    // Approach hint
    if (dist < TS * 5 && dist >= INTERACT_RANGE) {
      const hint = this.hasTorch
        ? 'Deep cave nearby — press E / A to enter'
        : 'Deep cave nearby — craft a Torch first! (Items tab)';
      this.hud.showMsg(hint, 600);
    }
    // Close prompt (no auto-enter — player must press E)
    if (dist < INTERACT_RANGE) {
      const prompt = this.hasTorch
        ? 'Press E / A to enter Deep Cave'
        : 'Press E / A — WARNING: Deep cave is PITCH BLACK without a Torch!';
      this.hud.showMsg(prompt, 800);
    }
  }

  _startDeepCaveTransition() {
    if (this._deepCaveTransitioning) return;
    this._deepCaveTransitioning = true;

    this.registry.set('inventory',       this.inventory);
    this.registry.set('playerHP',        this.playerHP);
    this.registry.set('playerMP',        this.playerMP);
    this.registry.set('hasRevive',       this.hasRevive);
    this.registry.set('wave',            this.wave);
    this.registry.set('hasPickaxe',      this.hasPickaxe);
    this.registry.set('pickaxeKey',      this.pickaxeKey);
    this.registry.set('hasSpeedBoots',   this.hasSpeedBoots);
    this.registry.set('weapon',          this.weapon);
    this.registry.set('armor',           this.armor);
    this.registry.set('helmet',          this.helmet   ?? null);
    this.registry.set('pants',           this.pants    ?? null);
    this.registry.set('setBoots',        this.setBoots ?? null);
    this.registry.set('playerArmor',     this.playerArmor);
    this.registry.set('playerAttackDmg', this.playerAttackDmg);
    this.registry.set('weaponCooldown',  this._weaponCooldown);
    this.registry.set('hasTorch',        this.hasTorch ?? false);
    this.registry.set('isHardcore',      this.isHardcore ?? false);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.sleep('Cave');
      this.scene.launch('DeepCave');
    });
  }

  // ============================================================
  // ENEMY SPAWNING
  // ============================================================
  _scheduleEnemySpawns() {
    this.time.addEvent({ delay: 45000, loop: true, callback: () => { if (this.alive) this._respawnResources(); } });
    this.time.addEvent({
      delay: 7500,
      callback: () => {
        if (!this.alive) return;
        const types = [...NIGHT_ENEMIES, ...DAY_ENEMIES.slice(0, 3)];
        const count = Phaser.Math.Between(2, 4);
        for (let i = 0; i < count; i++) {
          const type = types[Phaser.Math.Between(0, types.length - 1)];
          // Spawn at a random cave edge tile
          const edge = Phaser.Math.Between(0, 3);
          let ex, ey;
          if      (edge === 0) { ex = Phaser.Math.Between(2, CAVE_W - 3) * TS + TS / 2; ey = TS + TS / 2; }
          else if (edge === 1) { ex = (CAVE_W - 2) * TS + TS / 2; ey = Phaser.Math.Between(2, CAVE_H - 3) * TS + TS / 2; }
          else if (edge === 2) { ex = Phaser.Math.Between(2, CAVE_W - 3) * TS + TS / 2; ey = (CAVE_H - 2) * TS + TS / 2; }
          else                 { ex = TS + TS / 2; ey = Phaser.Math.Between(2, CAVE_H - 3) * TS + TS / 2; }
          this.enemyMgr.spawnAt(type, ex, ey);
        }
      },
      loop: true,
    });
  }

  _respawnResources() {
    for (let y = 0; y < CAVE_H; y++) {
      for (let x = 0; x < CAVE_W; x++) {
        const node = this.mapData[y]?.[x]?.resource;
        if (!node) continue;
        node.amt = node.maxAmt;
        node.sprite.setVisible(true);
      }
    }
    this.hud.showMsg('Cave resources replenished.', 2000);
  }

  // ============================================================
  // PLAYER DEATH
  // ============================================================
  onPlayerDeath() {
    if (this.hasRevive) {
      this.hasRevive = false;
      this.playerHP  = this.playerMaxHP;
      this.invincible = 3000;
      this.cameras.main.flash(200, 255, 255, 255);
      this.hud.showMsg('Revive Token used — 3s invincibility!', 3000);
      return;
    }
    // Delete the save immediately — no reloading to cheat death
    try {
      const key = this.registry.get('saveSlotKey') ?? `siege_eternal_save_${this.registry.get('slotId') ?? 1}`;
      localStorage.removeItem(key);
    } catch (_) {}
    this.alive = false;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Cave');
      this.scene.start('GameOver', { wave: this.registry.get('wave') ?? 1, slotId: this.registry.get('slotId') ?? 1 });
    });
  }
}
