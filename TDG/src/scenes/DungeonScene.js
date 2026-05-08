// ============================================================
// DungeonScene — 30×30 arena, hard enemies, vault keeper boss
// Enter via dungeon entrance (cursed zone) with dungeon_key
// ============================================================
import { TS, DUNGEON_W, DUNGEON_H, ENEMY_DEFS, DUNGEON_ENEMY_POOL } from '../constants.js';
import { soundMgr } from '../systems/SoundManager.js';
import { achievementSys } from '../systems/AchievementSystem.js';

const DW  = DUNGEON_W * TS;
const DH  = DUNGEON_H * TS;
const CLR = { floor: 0x1A1A2E, wall: 0x2D2D44, torch: 0xFF7700, accent: 0x4A0080 };

export class DungeonScene extends Phaser.Scene {
  constructor() { super({ key: 'Dungeon' }); }

  init(data) {
    this._wave     = data.wave     ?? 1;
    this._slotId   = data.slotId;
    this._saveKey  = data.saveSlotKey;
    this._hardcore = data.isHardcore;
    this._registry = data;
    this._enemies  = [];
    this._boss     = null;
    this._bossSpawned = false;
    this._cleared  = false;
    this._playerHP = data.playerHP ?? 100;
    this._playerMaxHP = data.playerMaxHP ?? 100;
    this._playerMP = data.playerMP ?? 0;
    this._attackDmg = data.playerAttackDmg ?? 10;
    this._inventory = data.inventory ? { ...data.inventory } : {};
    this._kills    = 0;
    this._requiredKills = 8 + Math.floor(this._wave / 3);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0A0A14');

    this._buildMap();
    this._spawnPlayer();
    this._spawnWave();
    this._buildHUD();
    this._setupInput();

    // Atmosphere
    this.cameras.main.startFollow(this._player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    this.add.text(DW / 2, 40, 'THE DUNGEON', {
      fontSize: '20px', color: '#AA44FF', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);
  }

  _buildMap() {
    const gfx = this.add.graphics();
    // Floor
    gfx.fillStyle(CLR.floor);
    gfx.fillRect(0, 0, DW, DH);
    // Border walls
    gfx.fillStyle(CLR.wall);
    gfx.fillRect(0, 0, DW, TS);
    gfx.fillRect(0, DH - TS, DW, TS);
    gfx.fillRect(0, 0, TS, DH);
    gfx.fillRect(DW - TS, 0, TS, DH);
    // Interior pillars
    for (let px = 3; px < DUNGEON_W - 3; px += 5) {
      for (let py = 3; py < DUNGEON_H - 3; py += 5) {
        gfx.fillStyle(CLR.wall);
        gfx.fillRect(px * TS, py * TS, TS, TS);
      }
    }
    // Accent glow lines
    gfx.fillStyle(CLR.accent, 0.4);
    gfx.fillRect(TS, TS, DW - TS * 2, 2);
    gfx.fillRect(TS, DH - TS - 2, DW - TS * 2, 2);

    // Torch lights scattered around
    const torchPositions = [[4, 4], [DUNGEON_W - 5, 4], [4, DUNGEON_H - 5], [DUNGEON_W - 5, DUNGEON_H - 5], [DUNGEON_W / 2, 4]];
    torchPositions.forEach(([tx, ty]) => {
      this.add.circle(tx * TS, ty * TS, 8, CLR.torch, 0.9).setDepth(5);
    });

    // Physics walls (static group)
    this._walls = this.physics.add.staticGroup();
    // Border wall bodies
    [[0, 0, DW, TS], [0, DH - TS, DW, TS], [0, 0, TS, DH], [DW - TS, 0, TS, DH]].forEach(([x, y, w, h]) => {
      const r = this.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false);
      this.physics.add.existing(r, true);
      this._walls.add(r);
    });

    // World bounds
    this.physics.world.setBounds(0, 0, DW, DH);
    this.cameras.main.setBounds(0, 0, DW, DH);
  }

  _spawnPlayer() {
    this._player = this.physics.add.sprite(DW / 2, DH - TS * 3, 'player')
      .setDepth(20).setCollideWorldBounds(true);
    this.physics.add.collider(this._player, this._walls);
  }

  _spawnWave() {
    const wave = this._wave;
    const count = this._requiredKills;

    for (let i = 0; i < count; i++) {
      const key = DUNGEON_ENEMY_POOL[Math.floor(Math.random() * DUNGEON_ENEMY_POOL.length)];
      const def = { ...ENEMY_DEFS[key] };
      const hpScale = 1 + wave * 0.12;
      const spawnX = Phaser.Math.Between(TS * 2, DW - TS * 2);
      const spawnY = Phaser.Math.Between(TS * 2, DH / 2);
      this._spawnEnemy(key, def, spawnX, spawnY, hpScale);
    }
  }

  _spawnEnemy(key, baseDef, x, y, hpScale = 1) {
    const def = { ...baseDef, hp: Math.floor(baseDef.hp * hpScale), maxHp: Math.floor(baseDef.hp * hpScale) };
    const sz     = def.sz ?? 14;
    const texKey = `e_${key}`;
    const sprite = this.physics.add.sprite(x, y, texKey)
      .setDisplaySize(sz * 2, sz * 2).setDepth(15);
    sprite.setCollideWorldBounds(true);
    this.physics.add.collider(sprite, this._walls);

    const enemy = { key, def, sprite, hp: def.hp, maxHp: def.hp, alive: true, _hitTimer: 0 };
    this._enemies.push(enemy);

    if (def.invis) sprite.setAlpha(0.15);
    return enemy;
  }

  _spawnBoss() {
    if (this._bossSpawned) return;
    this._bossSpawned = true;
    const def   = { ...ENEMY_DEFS.vault_keeper };
    const hpScale = 1 + this._wave * 0.10;
    def.hp = Math.floor(def.hp * hpScale);
    this._boss  = this._spawnEnemy('vault_keeper', def, DW / 2, TS * 3, hpScale);
    this._boss.sprite.setTint(0xAA00FF).setDisplaySize(90, 90).setDepth(16);
    soundMgr.play('bossAlert');
    this._showBossBar();

    this._bossLabel = this.add.text(DW / 2, TS * 3 - 60, '⚔ VAULT KEEPER', {
      fontSize: '14px', color: '#FF44FF', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);
  }

  _buildHUD() {
    this._hudBg = this.add.rectangle(480, 15, 400, 24, 0x000000, 0.7)
      .setScrollFactor(0).setDepth(100);
    this._hudText = this.add.text(480, 15, '', {
      fontSize: '10px', color: '#FFFFFF', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this._hpBar  = this.add.rectangle(10, 12, 160, 12, 0x333333).setScrollFactor(0).setDepth(100).setOrigin(0, 0.5);
    this._hpFill = this.add.rectangle(10, 12, 160, 12, 0xFF4444).setScrollFactor(0).setDepth(101).setOrigin(0, 0.5);
    this.add.text(12, 12, 'HP', { fontSize: '8px', color: '#FFFFFF', fontFamily: 'monospace' })
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(102);

    this._exitBtn = this.add.text(900, 15, '[ESC] Flee', {
      fontSize: '10px', color: '#AAAAAA', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101).setInteractive();
    this._exitBtn.on('pointerdown', () => this._flee());
  }

  _setupInput() {
    this._keys = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D',
      attack: 'L', interact: 'E', esc: 'ESC',
    });
    this.input.keyboard.on('keydown-ESC', () => this._flee());
    this.input.keyboard.on('keydown-L', () => {
      // Attack toward closest enemy or straight ahead
      let target = null, nearD = Infinity;
      for (const e of this._enemies ?? []) {
        if (!e.alive) continue;
        const d = Math.hypot(e.sprite.x - this._player.x, e.sprite.y - this._player.y);
        if (d < nearD) { nearD = d; target = e; }
      }
      const wx = target ? target.sprite.x : this._player.x + 32;
      const wy = target ? target.sprite.y : this._player.y;
      this._meleeAttack(wx, wy);
    });
    this.input.on('pointerdown', (ptr) => this._meleeAttack(ptr.worldX, ptr.worldY));
  }

  update(time, delta) {
    if (this._cleared) return;
    this._movePlayer(delta);
    this._updateEnemies(delta);
    this._updateHUD();
    this._checkClear();
  }

  _movePlayer(delta) {
    const spd  = 200;
    const keys = this._keys;
    let vx = 0, vy = 0;
    if (keys.left.isDown)  vx = -spd;
    if (keys.right.isDown) vx = spd;
    if (keys.up.isDown)    vy = -spd;
    if (keys.down.isDown)  vy = spd;
    this._player.setVelocity(vx, vy);
  }

  _updateEnemies(delta) {
    const px = this._player.x, py = this._player.y;
    for (const e of this._enemies) {
      if (!e.alive) continue;
      const sp = e.sprite;
      const spd = e.def.spd ?? 40;
      const dx  = px - sp.x, dy = py - sp.y;
      const d   = Math.hypot(dx, dy);
      if (d > 1) { sp.setVelocity((dx / d) * spd, (dy / d) * spd); }
      else        { sp.setVelocity(0, 0); }

      // Melee hit player
      e._hitTimer = (e._hitTimer ?? 0) + delta;
      if (d < (e.def.sz ?? 14) + 16 && e._hitTimer > 800) {
        e._hitTimer = 0;
        this._takeDamage(e.def.dmg ?? 10);
      }

      // Regen
      if (e.def.regen) {
        e.hp = Math.min(e.maxHp, e.hp + e.def.regen * (delta / 1000));
      }
    }
  }

  _takeDamage(dmg) {
    this._playerHP = Math.max(0, this._playerHP - dmg);
    soundMgr.play('playerHurt');
    if (this._playerHP <= 0) this._playerDeath();
  }

  _meleeAttack(wx, wy) {
    const dmg = this._attackDmg;
    const r   = 80;
    const px  = this._player.x, py = this._player.y;
    this._showSwingArc(px, py, wx, wy, r);
    for (const e of this._enemies ?? []) {
      if (!e.alive) continue;
      const d = Math.hypot(e.sprite.x - px, e.sprite.y - py);
      if (d < r) this._hitEnemy(e, dmg);
    }
  }

  _showSwingArc(ox, oy, tx, ty, r) {
    const angle  = Math.atan2(ty - oy, tx - ox);
    const spread = Math.PI * 0.55;
    const gfx    = this.add.graphics().setDepth(25);
    gfx.fillStyle(0xFFDD44, 0.18);
    gfx.beginPath();
    gfx.moveTo(ox, oy);
    gfx.arc(ox, oy, r * 0.85, angle - spread / 2, angle + spread / 2);
    gfx.closePath();
    gfx.fillPath();
    gfx.lineStyle(2.5, 0xFFDD44, 1);
    gfx.beginPath();
    gfx.arc(ox, oy, r * 0.85, angle - spread / 2, angle + spread / 2, false);
    gfx.strokePath();
    this.tweens.add({ targets: gfx, alpha: 0, duration: 220, ease: 'Power2', onComplete: () => gfx.destroy() });
  }

  _hitEnemy(e, dmg) {
    e.hp -= dmg;
    soundMgr.play('hit');
    if (e.hp <= 0) this._killEnemy(e);
    else {
      e.sprite.setTint(0xFFFFFF);
      this.time.delayedCall(100, () => { if (e.sprite?.active) e.sprite.clearTint(); });
    }
  }

  _killEnemy(e) {
    this._spawnDeathParticles(e.sprite.x, e.sprite.y,
      e.key === 'vault_keeper' ? 0xAA00FF : e.key === 'dungeon_golem' ? 0x888888 : 0xFF4444);
    e.alive = false;
    e.sprite.destroy();
    soundMgr.play('die');
    this._kills++;

    // Drop loot
    if (e.def.drop) {
      for (const [k, v] of Object.entries(e.def.drop)) {
        this._inventory[k] = (this._inventory[k] ?? 0) + v;
      }
    }

    // Boss kill — give big loot + mark achievement
    if (e.key === 'vault_keeper') {
      const bigLoot = { crystal: 15, ruby: 5, emerald: 5, gold: 40, souls: 25, void_shards: 3 };
      for (const [k, v] of Object.entries(bigLoot)) {
        this._inventory[k] = (this._inventory[k] ?? 0) + v;
      }
      // Blueprint drop — give a random dungeon blueprint
      const dungeonBlueprints = ['shadow_cannon', 'spirit_totem', 'oracle_beacon', 'thorn_cage'];
      const pick = dungeonBlueprints[Math.floor(Math.random() * dungeonBlueprints.length)];
      this._inventory[`bp_${pick}`] = 1;

      achievementSys.unlock('dungeon_clear');
      this._cleared = true;
      this._showClearScreen();
    }
  }

  _spawnDeathParticles(x, y, col) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      const dist  = 28 + Math.random() * 36;
      const dot   = this.add.circle(x, y, 2 + Math.random() * 2, col).setDepth(18);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
        alpha: 0, scaleX: 0.1, scaleY: 0.1,
        duration: 320 + Math.random() * 180,
        ease: 'Power2',
        onComplete: () => dot.destroy(),
      });
    }
  }

  _showBossBar() {
    if (this._bossBarBg) return;
    this._bossBarBg   = this.add.rectangle(480, 620, 420, 18, 0x220011)
      .setScrollFactor(0).setDepth(110).setStrokeStyle(1, 0x880044);
    this._bossBarFill = this.add.rectangle(270, 620, 420, 18, 0xAA00FF)
      .setScrollFactor(0).setDepth(111).setOrigin(0, 0.5);
    this._bossBarLabel = this.add.text(480, 601, '⚔  VAULT KEEPER', {
      fontSize: '10px', color: '#FF88FF', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(111);
  }

  _checkClear() {
    // All normal enemies dead → spawn boss
    const aliveNormal = this._enemies.filter(e => e.alive && e.key !== 'vault_keeper');
    if (aliveNormal.length === 0 && !this._bossSpawned) {
      this._spawnBoss();
    }
  }

  _showClearScreen() {
    soundMgr.play('bossDie');
    const bg = this.add.rectangle(480, 320, 500, 250, 0x000000, 0.9)
      .setScrollFactor(0).setDepth(200);
    this.add.text(480, 220, 'DUNGEON CLEARED!', {
      fontSize: '22px', color: '#FFD700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.add.text(480, 270, 'Blueprint dropped! Loot collected.', {
      fontSize: '12px', color: '#AAAAFF', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    this.time.delayedCall(3000, () => this._exit());
  }

  _playerDeath() {
    // Return to game at low HP — don't permadeath in dungeon itself
    this._playerHP = 5;
    this._flee();
  }

  _flee() {
    this._exit();
  }

  _exit() {
    // Push updated state back to registry
    this.registry.set('playerHP',        this._playerHP);
    this.registry.set('playerMP',        this._playerMP);
    this.registry.set('inventory',       this._inventory);
    this.registry.set('dungeonCleared',  this._cleared);
    this.scene.stop('Dungeon');
    this.scene.wake('Game');
  }

  _updateHUD() {
    const alive   = this._enemies.filter(e => e.alive && e.key !== 'vault_keeper').length;
    const bossHP  = this._boss?.alive ? Math.ceil(this._boss.hp) : 0;
    const bossMax = this._boss?.maxHp ?? 1;
    const phase   = this._bossSpawned ? `BOSS: ${bossHP}/${bossMax}` : `Enemies: ${alive} left`;
    this._hudText.setText(`DUNGEON  |  HP: ${Math.ceil(this._playerHP)}  |  Kills: ${this._kills}  |  ${phase}`);
    const pct = this._playerHP / (this._playerMaxHP || 1);
    this._hpFill.setDisplaySize(160 * Math.max(0, pct), 12);
    // Boss HP bar
    if (this._boss && this._bossBarFill) {
      const bpct = Math.max(0, this._boss.hp / this._boss.maxHp);
      this._bossBarFill.setDisplaySize(420 * bpct, 18);
      const barCol = bpct > 0.5 ? 0xAA00FF : bpct > 0.25 ? 0xFF4499 : 0xFF0000;
      this._bossBarFill.setFillStyle(barCol);
    }
  }
}
