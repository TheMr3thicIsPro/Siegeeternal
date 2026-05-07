// ============================================================
// GameScene — main game orchestrator
// ============================================================
import { TS, MW, MH, VW, VH, INTERACT_RANGE, PLAYER_SPEED, PICKAXE_TIERS, ORE_TIER_REQ, WALL_DEFS, CHEST_DEFS, MAP_THEMES, CURSED_TOWER_DEFS, BRIDGE_DEF, BLUEPRINT_DEFS, RELIC_DEFS, HELMET_DEFS, PANTS_DEFS, SET_BOOTS_DEFS, SET_BONUS_DEFS, CONSUMABLE_DEFS } from '../constants.js';
import { pdist } from '../utils.js';
import { MapGenerator }        from '../systems/MapGenerator.js';
import { EnemyManager }        from '../systems/EnemyManager.js';
import { TowerManager }        from '../systems/TowerManager.js';
import { WaveManager }         from '../systems/WaveManager.js';
import { WeatherSystem }       from '../systems/WeatherSystem.js';
import { HUD }                 from '../systems/HUD.js';
import { soundMgr }            from '../systems/SoundManager.js';
import { PerkSystem }          from '../systems/PerkSystem.js';
import { MiniObjectiveSystem } from '../systems/MiniObjectiveSystem.js';
import { blueprintSys }        from '../systems/BlueprintSystem.js';
import { metaProgression }     from '../systems/MetaProgression.js';
import { BackpackUI }          from '../systems/BackpackUI.js';
import { RelicSystem }         from '../systems/RelicSystem.js';
import { RaiderSystem }        from '../systems/RaiderSystem.js';
import { MutationSystem }      from '../systems/MutationSystem.js';
import { settingsStore }       from '../systems/SettingsStore.js';
import { PlayerLevelSystem }   from '../systems/PlayerLevelSystem.js';
import { ContractSystem }      from '../systems/ContractSystem.js';
import { MerchantSystem }      from '../systems/MerchantSystem.js';
import { achievementSys }      from '../systems/AchievementSystem.js';
import { multiplayerSys }      from '../systems/MultiplayerSystem.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.isNewGame      = data?.newGame !== false;
    this.slotId         = data?.slotId ?? 1;
    this.saveSlotKey    = `siege_eternal_save_${this.slotId}`;
    this.isHardcore     = data?.hardcore ?? false;
    this.challengeMods  = data?.challengeMods ?? {};
    this.multiplayer    = data?.multiplayer   ?? false;
    this.mpIsHost       = data?.isHost        ?? false;
    this.mpRoomCode     = data?.mpRoomCode    ?? null;
    this.mpSeed         = data?.mpSeed        ?? null;
    this._mpStateTimer  = 0;
    this._partnerSprite = null;
    this._partnerHP     = null;
  }

  // ============================================================
  // CREATE
  // ============================================================
  create() {
    // ── Shared state ──────────────────────────────────────
    // Use saved seed + theme if they exist (must happen before mapGen.generate)
    this.seed     = this.multiplayer && this.mpSeed ? this.mpSeed : Math.floor(Math.random() * 999999);
    this.mapTheme = MAP_THEMES[Math.floor(Math.random() * MAP_THEMES.length)];
    if (!this.isNewGame) {
      try {
        const _raw = localStorage.getItem(this.saveSlotKey) ?? localStorage.getItem('siege_eternal_save') ?? localStorage.getItem('dungeonkeep_save');
        if (_raw) {
          const _s = JSON.parse(_raw);
          if (_s.seed)     this.seed     = _s.seed;
          if (_s.mapTheme) this.mapTheme = _s.mapTheme;
        }
      } catch (_) {}
    }
    this.wave         = 0;
    this.alive        = true;
    this.hasRevive    = false;
    this.invincible   = 0;
    this.lastDmgTime  = 0;
    this.buildMode    = null;
    this.sleeping        = false;
    this._sleepBed       = null;   // reference to the bed obj the player is sleeping in
    this.hasPickaxe      = false;
    this.pickaxeKey      = null;
    this.hasSpeedBoots   = false;
    this.weapon          = null;
    this.bow             = null;   // separate bow slot — can carry bow + sword simultaneously
    this.armor           = null;
    this.helmet          = null;   // equipped helmet key (e.g. 'emerald_helmet')
    this.pants           = null;   // equipped pants key
    this.setBoots        = null;   // equipped set boots key (set-specific, not speed boots)
    this.playerArmor     = 0;
    this.playerAttackDmg = 10;
    this._attackCooldown = 0;
    this._weaponCooldown = 400;
    this.sellMode     = false;
    this._paused      = false;
    this._pauseMenu   = null;
    this.inventory    = { wood: 50, stone: 40, bone: 0, coal: 0, iron: 0, crystal: 0, gold: 0, ruby: 0, emerald: 0, souls: 0, raw_meat: 0, cooked_meat: 0, key_regular: 0, key_boss: 0, cursed_essence: 0, void_shards: 0, corrupted_wood: 0, corrupted_stone: 0, uncurse_token: 0, bridge_blueprint: 0 };
    this.chests       = [];
    this.mapData      = [];
    this.playerHP     = 100;  this.playerMaxHP = 100;
    this.playerMP     = 100;  this.playerMaxMP = 100;

    // Cave entrance position (set by MapGenerator)
    this.caveEntranceTile   = null;
    this._caveTransitioning = false;
    this._bowTimer          = 0;
    this._regenTimer        = 0;
    this._lastDamageSource  = null;
    this._bridges           = [];
    this._harvestBusy   = false;
    this.cursedTiles    = new Set();
    this.traps          = [];
    this.cows           = [];
    this.hasTorch       = false;
    // Boss-kill escalation — each boss death permanently buffs all enemies by 15%
    this.bossKillCount  = 0;
    this.bossBuff       = { hpMult: 1.0, dmgMult: 1.0, countMult: 1.0 };

    // ── Systems ───────────────────────────────────────────
    this.mapGen        = new MapGenerator(this);
    this.enemyMgr      = new EnemyManager(this);
    this.towerMgr      = new TowerManager(this);
    this.waveMgr       = new WaveManager(this);
    this.weatherSystem = new WeatherSystem(this);
    this.hud           = new HUD(this);
    this.perkSys       = new PerkSystem(this);
    this.miniObjSys    = new MiniObjectiveSystem(this);
    this.backpackUI    = new BackpackUI(this);
    this.relicSys       = new RelicSystem(this);
    this.raiderSys      = new RaiderSystem(this);
    this.mutationSys    = new MutationSystem(this);
    this.playerLevelSys = new PlayerLevelSystem(this);
    this.contractSys    = new ContractSystem(this);
    this.merchantSys    = new MerchantSystem(this);
    achievementSys.attachScene(this);
    this.events.on('player_level_up', (lvl) => {
      if (lvl >= 10) achievementSys.unlock('level_10');
    });
    this.events.on('achievement_check', (id) => achievementSys.unlock(id));
    this._playerPoisonTimer = 0;
    this._playerPoisonDot   = 0;
    this._relicPickups = [];
    this._wasInCursed  = false;

    // ── Build world ───────────────────────────────────────
    this.mapGen.generate(this.seed);
    this._createPlayer();
    if (this.riverGroup) this.physics.add.collider(this.player, this.riverGroup);
    this._createNightOverlay();
    if (!this.isHardcore) this._spawnCows();


    // ── HUD ───────────────────────────────────────────────
    this.hud.build();

    // ── Input ─────────────────────────────────────────────
    this._setupInput();
    this._setupGamepad();

    // ── Camera ────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, MW * TS, MH * TS);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.physics.world.setBounds(TS, TS, (MW - 2) * TS, (MH - 2) * TS);

    // ── Apply player settings ─────────────────────────────
    soundMgr.setVolume(settingsStore.sfxVolume);
    // Disable screen shake if player turned it off
    if (!settingsStore.screenShake) {
      this.cameras.main.shake = () => {};
    }

    // ── Listen for wake event (returning from cave, codex, or dungeon) ──
    this.events.on('wake', () => {
      if (this._codexOpen) { this._codexOpen = false; return; }

      // Returning from dungeon
      if (this._dungeonOpen) {
        this._dungeonOpen = false;
        const hp  = this.registry.get('playerHP');
        const inv = this.registry.get('inventory');
        if (hp  !== undefined) this.playerHP  = hp;
        if (inv !== undefined) this.inventory = { ...this.inventory, ...inv };
        if (this.registry.get('dungeonCleared')) {
          this.contractSys?.progress('dungeon_cleared', 1);
          achievementSys.unlock('dungeon_clear');
          this.registry.set('dungeonCleared', false);
        }
        this.cameras.main.fadeIn(500, 0, 0, 0);
        this.hud.showMsg('You emerge from the Dungeon!', 3000);
        return;
      }

      // Returning from cave
      this._caveTransitioning = true;
      this.time.delayedCall(2000, () => { this._caveTransitioning = false; });
      const hp    = this.registry.get('playerHP');
      const mp    = this.registry.get('playerMP');
      const rev   = this.registry.get('hasRevive');
      const torch = this.registry.get('hasTorch');
      if (hp    !== undefined) this.playerHP  = hp;
      if (mp    !== undefined) this.playerMP  = mp;
      if (rev   !== undefined) this.hasRevive = rev;
      if (torch !== undefined) this.hasTorch  = torch;
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.hud.showMsg('You emerge from the cave.', 3000);
    });

    // ── Start game ────────────────────────────────────────
    if (!this.isNewGame && this._loadSave()) {
      /* restored from save */
    } else {
      this._placeStartingWalls();
      this.waveMgr.startDay();
      this.hud.showMsg('Day 0 — Grace period. No enemies yet — build your defences!', 5000);
      this.contractSys.generateContracts(1);
      // Apply challenge mods on new game
      if (this.challengeMods?.hp1) {
        this.playerMaxHP = 1; this.playerHP = 1;
        this.hud.showMsg('CHALLENGE: 1 HP Mode active!', 5000);
      }
    }

    // Multiplayer setup
    if (this.multiplayer) {
      this._initMultiplayer();
    }
  }

  // ============================================================
  // UPDATE
  // ============================================================
  update(time, delta) {
    if (!this.alive) return;
    if (this._paused) { this._pollStartButton(); return; }

    this.waveMgr.update(delta);       // also calls weatherSystem.update() internally
    this._updatePlayer(delta, time);
    this._updateGamepad();          // after _updatePlayer so stick velocity wins
    this._updateCaveProximity();
    this.enemyMgr.update(delta, time);
    this.towerMgr.updateTowers(time, delta);
    this.towerMgr.updateProjectiles(delta);
    this.towerMgr.updateMachines(delta);
    this.towerMgr.updateWalls(delta);
    this._updateBow(delta);
    this._updateRegen(delta);
    this._updatePlayerPoison(delta);
    this._updateCows(delta);
    this._updateTraps(delta);
    this.hud.update();
    this.backpackUI?.update();
    this.perkSys.update(delta);
    this.miniObjSys.update(delta);
    this.relicSys?.update(delta);
    this.raiderSys?.update(time, delta);
    this._updateRelicPickups();
    this._updateZoneMessage();

    if (this.invincible > 0) this.invincible -= delta;
    this.playerMP = Math.min(this.playerMaxMP, this.playerMP + delta * 0.01);

    // Multiplayer state sync
    if (this.multiplayer && multiplayerSys._ready) {
      this._mpStateTimer = (this._mpStateTimer ?? 0) + delta;
      if (this._mpStateTimer > 100) {
        this._mpStateTimer = 0;
        multiplayerSys.sendState(this.player.x, this.player.y, this.playerHP, this.wave);
      }
    }
  }

  // ============================================================
  // MULTIPLAYER
  // ============================================================
  _initMultiplayer() {
    // Partner sprite (simple white rectangle)
    this._partnerSprite = this.add.rectangle(0, 0, 28, 28, 0x88BBFF, 0.8).setDepth(6).setVisible(false);
    this._partnerHPBar  = this.add.rectangle(0, 0, 28, 4, 0x44FF44).setDepth(7).setVisible(false);
    this._partnerLabel  = this.add.text(0, 0, 'P2', {
      fontSize: '8px', fill: '#88BBFF', fontFamily: 'monospace',
    }).setDepth(7).setVisible(false);

    const mp = multiplayerSys;
    this._mp = mp;

    mp.onPartnerState = (payload) => {
      if (!this._partnerSprite?.active) return;
      this._partnerSprite.setPosition(payload.x, payload.y).setVisible(true);
      this._partnerHPBar.setPosition(payload.x, payload.y + 18).setVisible(true);
      this._partnerLabel.setPosition(payload.x - 8, payload.y - 24).setVisible(true);
      this._partnerHP = payload.hp;
      const pct = Math.max(0, Math.min(1, payload.hp / 100));
      this._partnerHPBar.setScale(pct, 1);
    };

    mp.onPartnerDeath = () => {
      this.hud?.showMsg('Your partner has fallen! You both lose...', 4000);
      this.time.delayedCall(3000, () => this.onPlayerDeath?.());
    };

    mp.onEnemyKill = ({ enemyId }) => {
      const enemy = this.enemyMgr?.enemies?.find(e => e._mpId === enemyId);
      if (enemy && enemy.alive) { enemy.hp = 0; }
    };
  }

  // ============================================================
  // PLAYER
  // ============================================================
  _createPlayer() {
    const cx = Math.floor(MW / 2) * TS + TS / 2;
    const cy = Math.floor(MH / 2) * TS + TS / 2;
    this.player = this.add.sprite(cx, cy, 'player').setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setSize(20, 20).setCollideWorldBounds(true);
  }

  _updatePlayer(delta, time) {
    const keys = this._keys;
    const spd  = PLAYER_SPEED * this._getSpeedMult();
    let vx = 0, vy = 0;
    if (keys.left.isDown)  vx -= spd;
    if (keys.right.isDown) vx += spd;
    if (keys.up.isDown)    vy -= spd;
    if (keys.down.isDown)  vy += spd;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    if (this.sleeping) { vx = 0; vy = 0; }
    this.player.body.setVelocity(vx, vy);

    if (Phaser.Input.Keyboard.JustDown(keys.interact)) {
      if (!this._tryCaveEnter() && !this._tryDungeonEnter() && !this._tryMerchantShop() && !this._tryBed() && !this._tryCampfire() && !this._tryChest() && !this._tryUncurse()) this._tryHarvest();
    }
    if (Phaser.Input.Keyboard.JustDown(this._keys.attack)) this._tryAttack();
    if (Phaser.Input.Keyboard.JustDown(this._keys.perkActive)) this.perkSys.triggerActive();
    if (this._attackCooldown > 0) this._attackCooldown -= delta;
  }

  // Only used when game is paused — checks Start so controller can unpause
  _pollStartButton() {
    if (!this._gpPrev) return;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let raw = null;
    for (let i = 0; i < pads.length; i++) { if (pads[i]?.connected) { raw = pads[i]; break; } }
    if (!raw) return;
    const cur = raw.buttons[9]?.pressed ?? false;
    const was = this._gpPrev[9] ?? false;
    this._gpPrev[9] = cur;
    if (cur && !was) this._togglePause();
  }

  _updateGamepad() {
    if (!this._gpPrev) return;
    const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
    let raw = null;
    for (let i = 0; i < rawPads.length; i++) {
      if (rawPads[i] && rawPads[i].connected) { raw = rawPads[i]; break; }
    }
    if (!raw) return;

    if (!this._gpDetected) {
      this._gpDetected = true;
      this._gpCursorGfx?.setVisible(true);
      this.hud?.showMsg('Controller ready!  RT=click cursor  B=craft  Y=sell  X=attack', 4000);
    }

    const DEAD = 0.15;

    // ── Right stick — move screen cursor (always active) ──
    const rsx = +raw.axes[2] || 0;
    const rsy = +raw.axes[3] || 0;
    const cursorSpd = 7 * (settingsStore?.cursorSensitivity ?? 1);
    if (Math.abs(rsx) > DEAD) this._gpCursorX = Math.max(0, Math.min(VW, this._gpCursorX + rsx * cursorSpd));
    if (Math.abs(rsy) > DEAD) this._gpCursorY = Math.max(0, Math.min(VH, this._gpCursorY + rsy * cursorSpd));

    // Keep activePointer in sync so HUD build cursor tracks the crosshair
    this.input.activePointer.x = this._gpCursorX;
    this.input.activePointer.y = this._gpCursorY;
    this._gpCursorGfx?.setPosition(this._gpCursorX, this._gpCursorY);

    const prev = this._gpPrev;
    const just = (i) => {
      const cur = raw.buttons[i]?.pressed ?? false;
      const was = prev[i] ?? false;
      prev[i] = cur;
      return cur && !was;
    };

    // Start = pause
    if (just(9)) { this._togglePause(); return; }

    // ── Left stick — player movement ──────────────────────
    const lsx = +raw.axes[0] || 0;
    const lsy = +raw.axes[1] || 0;
    if ((Math.abs(lsx) > DEAD || Math.abs(lsy) > DEAD) && !this.sleeping) {
      const gpSpd = PLAYER_SPEED * this._getSpeedMult();
      let vx = Math.abs(lsx) > DEAD ? lsx * gpSpd : 0;
      let vy = Math.abs(lsy) > DEAD ? lsy * gpSpd : 0;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
      this.player.body.setVelocity(vx, vy);
    }

    // ── RT — click at cursor (place / sell / attack) ──────
    if (just(7)) {
      const ptr = { x: this._gpCursorX, y: this._gpCursorY };
      if      (this.sellMode)   this._trySell(ptr);
      else if (this.buildMode)  this._tryPlace(ptr);
      else                      this._tryAttack();
    }

    // ── A — interact / harvest / craft-confirm ────────────
    if (just(0)) {
      if (this.hud.isCraftOpen())                           this.hud._onSlotClick(this._gamepadMenuIdx);
      else if (!this._tryCaveEnter() && !this._tryBed() && !this._tryCampfire() && !this._tryChest() && !this._tryUncurse()) this._tryHarvest();
    }

    // ── B — craft menu / cancel build ─────────────────────
    if (just(1)) {
      if (this.hud.isCraftOpen()) {
        this.hud.closeCraft();
      } else if (this.buildMode) {
        this.buildMode = null;
        this.hud.showMsg('Build cancelled.', 1000);
      } else {
        this._gamepadMenuIdx = 0;
        this._gamepadTabIdx  = 0;
        this.hud.openCraft();
        this.hud._selectTab(0);
      }
    }

    if (just(2)) { this._tryAttack(); }             // X
    if (just(3)) { this._toggleSellMode(); }        // Y
    if (just(6)) { this.perkSys.triggerActive(); }  // LT — active perk ability (Q)
    if (just(8)) { this.backpackUI?.toggle(); }      // Back/Select — backpack

    // ── Craft menu navigation ─────────────────────────────
    if (this.hud.isCraftOpen()) {
      if (just(4)) { this._gamepadTabIdx = (this._gamepadTabIdx - 1 + 6) % 6; this._gamepadMenuIdx = 0; this.hud._selectTab(this._gamepadTabIdx); }
      if (just(5)) { this._gamepadTabIdx = (this._gamepadTabIdx + 1) % 6;     this._gamepadMenuIdx = 0; this.hud._selectTab(this._gamepadTabIdx); }
      if (just(12)) { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 4); this.hud._selectSlot(this._gamepadMenuIdx); }
      if (just(13)) { this._gamepadMenuIdx = Math.min(15, this._gamepadMenuIdx + 4); this.hud._selectSlot(this._gamepadMenuIdx); }
      if (just(14)) { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 1); this.hud._selectSlot(this._gamepadMenuIdx); }
      if (just(15)) { this._gamepadMenuIdx = Math.min(15, this._gamepadMenuIdx + 1); this.hud._selectSlot(this._gamepadMenuIdx); }
    }

    // ── D-pad tile-snap while in build mode ───────────────
    if (this.buildMode && !this.hud.isCraftOpen()) {
      const cam = this.cameras.main;
      let tx = Math.floor((cam.scrollX + this._gpCursorX) / TS);
      let ty = Math.floor((cam.scrollY + this._gpCursorY) / TS);
      if (just(14)) tx--; if (just(15)) tx++;
      if (just(12)) ty--; if (just(13)) ty++;
      tx = Math.max(1, Math.min(MW - 2, tx));
      ty = Math.max(1, Math.min(MH - 2, ty));
      // Snap cursor to tile centre
      const snappedX = tx * TS + TS / 2 - cam.scrollX;
      const snappedY = ty * TS + TS / 2 - cam.scrollY;
      if (snappedX >= 0 && snappedX <= VW) this._gpCursorX = snappedX;
      if (snappedY >= 0 && snappedY <= VH) this._gpCursorY = snappedY;
    }
  }

  _tryHarvest() {
    if (this._harvestBusy) return;
    const px = this.player.x, py = this.player.y;
    let best = null, bestD = INTERACT_RANGE;

    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
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
    this._showHarvestAnim(best.sprite.x, best.sprite.y);
    soundMgr.harvest();

    this.time.delayedCall(300, () => {
      this._harvestBusy = false;
      if (best.amt <= 0) return;
      const gain = Math.min(best.amt, Phaser.Math.Between(2, 4));
      best.amt -= gain;
      this.inventory[best.type] = (this.inventory[best.type] || 0) + gain;
      this.enemyMgr.spawnParticles(best.sprite.x, best.sprite.y, 0xC8A96E, 5);
      if (best.amt <= 0) best.sprite.setVisible(false);
      this.hud.showMsg(`+${gain} ${best.type}`, 900);
    });
  }

  _showHarvestAnim(tx, ty) {
    const px = this.player.x, py = this.player.y;
    const angle = Math.atan2(ty - py, tx - px);
    this.player.setTint(0xFFAA55);
    this.time.delayedCall(300, () => { if (this.player.active) this.applyArmorTint(this.armor); });
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0xC8A96E);
    g.fillRect(0, -2, 20, 4);
    g.setPosition(px + Math.cos(angle) * 16, py + Math.sin(angle) * 16);
    g.setRotation(angle);
    this.tweens.add({ targets: g, rotation: angle + 0.9, alpha: 0, duration: 260, ease: 'Power2', onComplete: () => g.destroy() });
  }

  _updateBow(delta) {
    if (!this.bow) return;
    let interval, dmg;
    if      (this.bow === 'ruby_bow')    { interval = 800;  dmg = 15; }
    else if (this.bow === 'emerald_bow') { interval = 3000; dmg = 45; }
    else                                  { interval = 2000; dmg = 20; }
    this._bowTimer += delta;
    if (this._bowTimer < interval) return;
    this._bowTimer = 0;
    const BOW_RANGE = 220;
    let target = null, nearD = BOW_RANGE;
    for (const e of this.enemyMgr.enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.sprite.x - this.player.x, e.sprite.y - this.player.y);
      if (d < nearD) { nearD = d; target = e; }
    }
    if (!target) return;
    // Arrow visual
    this._spawnBowArrow(this.player.x, this.player.y, target);
    // Damage applied on arrival (interval proportional to distance)
    const travelMs = Math.max(80, nearD * 1.5);
    this.time.delayedCall(travelMs, () => {
      if (!target.alive) return;
      target.hp -= dmg;
      if (target.sprite?.active) {
        target.sprite.setTint(0xFFFF00);
        this.time.delayedCall(80, () => { if (target.sprite?.active) target.sprite.clearTint(); });
      }
      this.enemyMgr.spawnParticles(target.sprite.x, target.sprite.y, 0xFFFF00, 3);
    });
  }

  _spawnBowArrow(fromX, fromY, target) {
    const arrow = this.add.image(fromX, fromY, 'proj_arrow_player').setDepth(5);
    const dx = target.sprite.x - fromX;
    const dy = target.sprite.y - fromY;
    arrow.setRotation(Math.atan2(dy, dx));
    const dist = Math.hypot(dx, dy);
    const travelMs = Math.max(80, dist * 1.5);
    this.tweens.add({
      targets: arrow,
      x: target.sprite.x,
      y: target.sprite.y,
      duration: travelMs,
      ease: 'Linear',
      onComplete: () => { arrow.destroy(); },
    });
  }

  _repairAllTowers() {
    let count = 0;
    for (const tower of this.towerMgr.towers) {
      if (tower.hp < tower.maxHp) { tower.hp = tower.maxHp; count++; }
    }
    this.hud.showMsg(`Regen Token used — ${count} tower${count !== 1 ? 's' : ''} repaired!`, 2500);
  }

  _startRegen() {
    this._regenTimer = 30000;
    this.hud.showMsg('Regenerating 2 HP/s for 30s', 2500);
  }

  _updateRegen(delta) {
    if (this._regenTimer <= 0) return;
    this._regenTimer -= delta;
    this.playerHP = Math.min(this.playerMaxHP, this.playerHP + delta * 0.002);
  }

  _updatePlayerPoison(delta) {
    if (this._playerPoisonTimer <= 0) return;
    this._playerPoisonTimer -= delta;
    this._playerPoisonDotTimer = (this._playerPoisonDotTimer ?? 0) - delta;
    if (this._playerPoisonDotTimer <= 0) {
      this._playerPoisonDotTimer = 1000;
      if (this.invincible <= 0) {
        this.playerHP = Math.max(0, this.playerHP - (this._playerPoisonDot || 3));
        if (this.playerHP <= 0) this.onPlayerDeath?.();
      }
    }
    if (this._playerPoisonTimer <= 0) {
      this._playerPoisonTimer = 0;
      this._playerPoisonDot   = 0;
    }
  }

  // ── Armor tint ────────────────────────────────────────────

  applyArmorTint(armorKey) {
    const TINTS = {
      armor_bone:    0xF0E0C8,
      armor_iron:    0xC8D0D8,
      armor_crystal: 0x88DDD0,
      armor_ruby:    0xFF8899,
      armor_emerald: 0x88EE99,
    };
    const tint = TINTS[armorKey];
    if (tint) this.player.setTint(tint);
    else       this.player.clearTint();
  }

  // ── Armor set helpers ────────────────────────────────────

  _getSpeedMult() {
    if (this.hasSpeedBoots) return 1.30;
    if (!this.setBoots) return 1;
    const bd = SET_BOOTS_DEFS[this.setBoots];
    if (!bd) return 1;
    const isNight = !(this.waveMgr?.isDay ?? true);
    if (bd.nightSpdMult && isNight) return bd.nightSpdMult;
    return bd.spdMult ?? 1;
  }

  _getArmorSet() {
    if (!this.armor || !this.helmet || !this.pants || !this.setBoots) return null;
    const chestSet  = this.armor.replace('armor_', '');
    const helmetSet = HELMET_DEFS[this.helmet]?.set;
    const pantsSet  = PANTS_DEFS[this.pants]?.set;
    const bootsSet  = SET_BOOTS_DEFS[this.setBoots]?.set;
    if (chestSet === helmetSet && chestSet === pantsSet && chestSet === bootsSet) return chestSet;
    return null;
  }

  // ── Campfire interaction ──────────────────────────────────

  _tryCampfire() {
    for (const m of this.towerMgr.machines) {
      if (m.key !== 'campfire') continue;
      if (pdist({ x: this.player.x, y: this.player.y }, m.sprite) > INTERACT_RANGE) continue;
      if (this.isHardcore) {
        this.hud.showMsg('No food in Hardcore mode!', 2000);
        return true;
      }
      if ((this.inventory.raw_meat || 0) > 0) {
        this.inventory.raw_meat--;
        this.inventory.cooked_meat = (this.inventory.cooked_meat || 0) + 1;
        this.hud.showMsg('Raw meat cooked! Press E again to eat.', 2000);
        this.enemyMgr.spawnParticles(m.sprite.x, m.sprite.y, 0xFF8800, 5);
        return true;
      }
      if ((this.inventory.cooked_meat || 0) > 0) {
        this.inventory.cooked_meat--;
        this.playerHP = Math.min(this.playerMaxHP, this.playerHP + 30);
        this.hud.showMsg('Ate cooked meat! +30 HP', 2000);
        this.enemyMgr.spawnParticles(this.player.x, this.player.y, 0xFF4488, 6);
        return true;
      }
      this.hud.showMsg('Nothing to cook or eat. Kill cows for raw meat!', 2000);
      return true;
    }
    return false;
  }

  // ── Chests ────────────────────────────────────────────────

  _tryChest() {
    if (!this.chests || this.chests.length === 0) return false;
    const px = this.player.x, py = this.player.y;
    for (const chest of this.chests) {
      if (chest.isOpen) continue;
      if (Math.hypot(chest.sprite.x - px, chest.sprite.y - py) > INTERACT_RANGE) continue;
      const type = chest.type;

      if (type === 'regular' || type === 'boss') {
        const def = CHEST_DEFS[type];
        if (!def) continue;
        const have = this.inventory[def.keyItem] || 0;
        if (have <= 0) {
          const hint = def.keyItem === 'key_boss'
            ? 'Boss Key needed  —  15% drop from bosses'
            : 'Regular Key needed  —  40% drop from Crystal Wraith (Deep Cave)';
          this.hud.showMsg(`Locked!  ${hint}`, 3500);
          return true;
        }
        this.inventory[def.keyItem]--;
        this._openKeyedChest(chest, def);
        return true;
      }

      if (type === 'starter')   { this._openStarterChest(chest);   return true; }
      if (type === 'cursed')    { this._openCursedChest(chest);    return true; }
      if (type === 'trap')      { this._openTrapChest(chest);      return true; }
      if (type === 'legendary') { this._openLegendaryChest(chest); return true; }
      if (type === 'blueprint') { this._openBlueprintChest(chest); return true; }
    }
    return false;
  }

  _tryUncurse() {
    if (!this.inventory.uncurse_token || this.inventory.uncurse_token <= 0) return false;
    const px = this.player.x, py = this.player.y;
    let nearest = null, nearestD = INTERACT_RANGE * 1.5;
    for (const tower of this.towerMgr.towers) {
      if (!tower.corrupted) continue;
      const d = Math.hypot(tower.sprite.x - px, tower.sprite.y - py);
      if (d < nearestD) { nearestD = d; nearest = tower; }
    }
    if (!nearest) return false;
    nearest.corrupted = false;
    nearest.corruptionTimer = 0;
    nearest.sprite.clearTint();
    if (nearest.isCursed) nearest.sprite.setTint(0xCC44FF);
    this.inventory.uncurse_token--;
    this.hud.showMsg(`${nearest.def.name} cleansed! Uncurse Token used.`, 3500);
    this.enemyMgr.spawnParticles(nearest.sprite.x, nearest.sprite.y, 0x00FFCC, 14);
    this.cameras.main.flash(150, 0, 220, 180);
    return true;
  }

  _openStarterChest(chest) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open').clearTint();
    if (chest.label) chest.label.setVisible(false);

    // Randomised starter packs — always good resources, but varies each run
    const PACKS = [
      { wood: 55, stone: 25, bone: 20, coal: 8,  iron: 3                    },
      { wood: 30, stone: 55, iron: 10, coal: 12, bone: 10                    },
      { wood: 45, stone: 25, bone: 35, souls: 15, coal: 5                   },
      { wood: 35, stone: 40, coal: 18, iron: 8,  bone: 12                   },
      { wood: 60, stone: 20, bone: 25, gold: 8,  coal: 6                    },
      { wood: 40, stone: 30, iron: 6,  crystal: 2, bone: 20, coal: 10       },
    ];
    const pack = { ...PACKS[Math.floor(Math.random() * PACKS.length)] };
    // Always sprinkle some souls
    pack.souls = (pack.souls || 0) + Phaser.Math.Between(5, 15);

    const msgs = [];
    Object.entries(pack).forEach(([r, n]) => {
      this.inventory[r] = (this.inventory[r] || 0) + n;
      msgs.push(`+${n} ${r}`);
    });

    this.hud.showMsg(`Starter Chest!  ${msgs.slice(0, 5).join('  ')}`, 6000);
    this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xAAFFAA, 18);
    this.cameras.main.flash(120, 170, 255, 170);
    soundMgr.build();
  }

  _openKeyedChest(chest, def) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open');
    if (chest.label) chest.label.setVisible(false);
    const rewards = [];
    Object.entries(def.rewards).forEach(([res, amt]) => {
      this.inventory[res] = (this.inventory[res] || 0) + amt;
      rewards.push(`+${amt} ${res}`);
    });
    // Boss chest: 40% perk blueprint. Regular chest: 20% any blueprint
    const bpName = chest.type === 'boss' && Math.random() < 0.4
      ? blueprintSys.unlockRandomPerk()
      : chest.type === 'regular' && Math.random() < 0.2
        ? blueprintSys.unlockRandom()
        : null;
    // Regular + boss chests: 20% chance to also contain a Bridge Blueprint (per-run)
    let bridgeMsg = '';
    if (Math.random() < 0.2) {
      this.inventory.bridge_blueprint = (this.inventory.bridge_blueprint || 0) + 1;
      bridgeMsg = '  + BRIDGE BLUEPRINT!';
    }
    const bpMsg = (bpName ? `  + BLUEPRINT: ${bpName}!` : '') + bridgeMsg;
    this.hud.showMsg(`${def.label} opened!  ${rewards.slice(0, 4).join('  ')}${bpMsg}`, 6000);
    this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xFFDD44, 18);
    this.cameras.main.flash(120, 255, 220, 100);
    soundMgr.build();
  }

  _openCursedChest(chest) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open');
    if (chest.label) chest.label.setVisible(false);
    const good = Math.random() < 0.5;
    if (good) {
      const choices = [
        () => { this.inventory.crystal = (this.inventory.crystal || 0) + 5; return '+5 crystal'; },
        () => { this.inventory.souls = (this.inventory.souls || 0) + 20; return '+20 souls'; },
        () => { this.inventory.cursed_essence = (this.inventory.cursed_essence || 0) + 8; return '+8 cursed_essence'; },
        () => { this.inventory.gold = (this.inventory.gold || 0) + 10; return '+10 gold'; },
        () => { const n = blueprintSys.unlockRandomPerk(); return n ? `PERK BLUEPRINT: ${n}!` : '+5 cursed_essence'; },
      ];
      const msg = choices[Math.floor(Math.random() * choices.length)]();
      this.hud.showMsg(`Cursed Chest — Lucky! ${msg}`, 3500);
      this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xCC44FF, 14);
    } else {
      const bad = [
        () => { this.playerHP = Math.max(1, this.playerHP - 20); return '-20 HP'; },
        () => { this.inventory.wood = Math.max(0, (this.inventory.wood || 0) - 30); return '-30 wood'; },
        () => { this.inventory.iron = Math.max(0, (this.inventory.iron || 0) - 5); return '-5 iron'; },
        () => { this._spawnTrapEnemies(chest, 3); return 'enemies!'; },
      ];
      const msg = bad[Math.floor(Math.random() * bad.length)]();
      this.hud.showMsg(`Cursed Chest — CURSED! ${msg}`, 3500);
      this.cameras.main.shake(300, 0.01);
      this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xFF2222, 10);
    }
    soundMgr.build();
  }

  _openTrapChest(chest) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open');
    if (chest.label) chest.label.setVisible(false);
    this._spawnTrapEnemies(chest, 5 + Math.floor(this.wave * 0.5));
    this.hud.showMsg('TRAP CHEST! Enemies ambush!', 3000);
    this.cameras.main.shake(400, 0.015);
    this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xFF4400, 16);
    soundMgr.build();
  }

  _spawnTrapEnemies(chest, count) {
    const pool = ['shambler', 'skitterer', 'soul_eater', 'ravager'];
    for (let i = 0; i < Math.min(count, 8); i++) {
      const key = pool[Math.floor(Math.random() * pool.length)];
      const angle = Math.random() * Math.PI * 2;
      const r = 48 + Math.random() * 32;
      this.enemyMgr.spawnAt(chest.sprite.x + Math.cos(angle) * r, chest.sprite.y + Math.sin(angle) * r, key);
    }
  }

  _openLegendaryChest(chest) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open');
    if (chest.label) chest.label.setVisible(false);
    this.inventory.crystal        = (this.inventory.crystal        || 0) + 15;
    this.inventory.ruby           = (this.inventory.ruby           || 0) + 5;
    this.inventory.emerald        = (this.inventory.emerald        || 0) + 5;
    this.inventory.gold           = (this.inventory.gold           || 0) + 20;
    this.inventory.souls          = (this.inventory.souls          || 0) + 30;
    this.inventory.cursed_essence = (this.inventory.cursed_essence || 0) + 5;
    this._dropRelic(chest.sprite.x, chest.sprite.y);
    // 60% chance to also drop a perk blueprint
    const perkName = Math.random() < 0.6 ? blueprintSys.unlockRandomPerk() : null;
    const bpMsg = perkName ? `  + PERK BLUEPRINT: ${perkName}!` : '';
    this.hud.showMsg(`LEGENDARY! +15 crystal +5 ruby +20 gold +30 souls + RELIC!${bpMsg}`, 7000);
    this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0xFFDD00, 28);
    this.cameras.main.flash(200, 255, 240, 50);
    soundMgr.build();
  }

  _openBlueprintChest(chest) {
    chest.isOpen = true;
    chest.sprite.setTexture('chest_open');
    if (chest.label) chest.label.setVisible(false);
    // Blueprint chest always gives one blueprint — 50/50 tower vs perk
    const name = Math.random() < 0.5
      ? (blueprintSys.unlockRandomTower() ?? blueprintSys.unlockRandomPerk())
      : (blueprintSys.unlockRandomPerk()  ?? blueprintSys.unlockRandomTower());
    if (name) {
      this.hud.showMsg(`BLUEPRINT CHEST! Unlocked: ${name}  (permanent — survives permadeath)`, 6000);
    } else {
      this.inventory.cursed_essence = (this.inventory.cursed_essence || 0) + 10;
      this.hud.showMsg('Blueprint Chest — all blueprints already owned! +10 cursed essence', 4000);
    }
    this.enemyMgr.spawnParticles(chest.sprite.x, chest.sprite.y, 0x44AAFF, 18);
    this.cameras.main.flash(120, 100, 200, 255);
    soundMgr.build();
  }

  _dropRelic(wx, wy) {
    if (!this.relicSys) return;
    const keys = Object.keys(RELIC_DEFS);
    const available = keys.filter(k => !this.relicSys.has(k));
    if (!available.length) return;
    const key = available[Math.floor(Math.random() * available.length)];
    const texMap = { blood_core: 'relic_blood', time_breaker: 'relic_time', greed_idol: 'relic_greed', soul_engine: 'relic_soul' };
    const sp = this.add.sprite(wx, wy - 16, texMap[key] ?? 'blueprint_item').setDepth(6);
    this.tweens.add({ targets: sp, y: wy - 24, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this._relicPickups.push({ key, sprite: sp, wx, wy, collected: false });
  }

  _updateRelicPickups() {
    if (!this._relicPickups?.length) return;
    const px = this.player.x, py = this.player.y;
    for (const p of this._relicPickups) {
      if (p.collected) continue;
      if (Math.hypot(px - p.wx, py - p.wy) < 24) {
        p.collected = true;
        p.sprite.destroy();
        this.relicSys.collect(p.key);
        const names = { blood_core: 'Blood Core', time_breaker: 'Time Breaker', greed_idol: 'Greed Idol', soul_engine: 'Soul Engine' };
        this.hud.showMsg(`RELIC: ${names[p.key] ?? p.key} collected!`, 4000);
        this.cameras.main.flash(150, 200, 50, 255);
      }
    }
    this._relicPickups = this._relicPickups.filter(p => !p.collected);
  }

  _updateZoneMessage() {
    const ty = Math.floor(this.player.y / TS);
    const inCursed = ty <= (this.cursedZoneMaxY ?? -1);
    if (inCursed !== this._wasInCursed) {
      this._wasInCursed = inCursed;
      if (inCursed) this.hud.showMsg('WARNING: ENTERING CURSED ZONE — enemies are 2× stronger!', 4000);
      else          this.hud.showMsg('Returned to safe zone.', 2000);
    }
  }

  // ── Cows ──────────────────────────────────────────────────

  _spawnCows() {
    const count = 6 + Phaser.Math.Between(0, 4);
    for (let i = 0; i < count; i++) {
      let tx, ty, attempts = 0;
      do {
        tx = Phaser.Math.Between(4, MW - 5);
        ty = Phaser.Math.Between(4, MH - 5);
        attempts++;
      } while (attempts < 30 && this.mapData[ty]?.[tx]?.structure);

      const wx = tx * TS + TS / 2, wy = ty * TS + TS / 2;
      const sp = this.add.sprite(wx, wy, 'cow').setDepth(5);
      this.physics.add.existing(sp);
      sp.body.setSize(18, 18).setCollideWorldBounds(true);
      this.cows.push({ sprite: sp, hp: 20, alive: true, wanderTimer: Phaser.Math.Between(0, 2000), vx: 0, vy: 0 });
    }
  }

  _updateCows(delta) {
    for (const cow of this.cows) {
      if (!cow.alive) continue;
      cow.wanderTimer -= delta;
      if (cow.wanderTimer <= 0) {
        cow.wanderTimer = Phaser.Math.Between(2000, 5000);
        const angle = Math.random() * Math.PI * 2;
        const spd   = Phaser.Math.Between(0, 1) ? 40 : 0;
        cow.sprite.body.setVelocity(Math.cos(angle) * spd, Math.sin(angle) * spd);
      }
    }
    this.cows = this.cows.filter(c => c.alive);
  }

  _killCow(cow) {
    cow.alive = false;
    this.enemyMgr.spawnParticles(cow.sprite.x, cow.sprite.y, 0xFF9988, 8);
    cow.sprite.destroy();
    const drops = Phaser.Math.Between(2, 3);
    this.inventory.raw_meat = (this.inventory.raw_meat || 0) + drops;
    this.hud.showMsg(`+${drops} Raw Meat`, 1500);
  }

  // ── Traps ─────────────────────────────────────────────────

  _updateTraps(delta) {
    const enemies = this.enemyMgr.enemies;
    const px = this.player.x, py = this.player.y;
    const now = this.time.now;

    for (const trap of this.traps) {
      if (!trap.alive) continue;
      const wx = trap.wx, wy = trap.wy;

      if (trap.type === 'landmine') {
        if (Math.hypot(px - wx, py - wy) < 16) { this._explodeMine(trap); continue; }
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.sprite.x - wx, e.sprite.y - wy) < 16) { this._explodeMine(trap); break; }
        }
      } else if (trap.type === 'tripwire') {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.sprite.x - wx, e.sprite.y - wy) < 22) { e.slow = 0.3; e.slowTimer = 3000; }
        }
      } else if (trap.type === 'spike_pit') {
        if (!trap.hitTimer || now - trap.hitTimer > 800) {
          let didHit = false;
          for (const e of enemies) {
            if (!e.alive) continue;
            if (Math.hypot(e.sprite.x - wx, e.sprite.y - wy) < 22) {
              e.hp -= 25;
              this.enemyMgr.spawnParticles(e.sprite.x, e.sprite.y, 0xFF4444, 3);
              didHit = true;
            }
          }
          if (Math.hypot(px - wx, py - wy) < 22 && this.invincible <= 0 && now - this.lastDmgTime > 800) {
            this.lastDmgTime = now;
            this.playerHP = Math.max(0, this.playerHP - 15);
            didHit = true;
          }
          if (didHit) trap.hitTimer = now;
        }
      } else if (trap.type === 'glue_pool') {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.sprite.x - wx, e.sprite.y - wy) < 22) { e.slow = 0.05; e.slowTimer = 4000; }
        }
      }
    }

    this.traps = this.traps.filter(t => t.alive);
  }

  _explodeMine(trap) {
    trap.alive = false;
    trap.sprite.destroy();
    const wx = trap.wx, wy = trap.wy;
    for (const e of this.enemyMgr.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.sprite.x - wx, e.sprite.y - wy) < 64) e.hp -= 50;
    }
    if (Math.hypot(this.player.x - wx, this.player.y - wy) < 64) {
      const dmg = Math.max(0, 50 - (this.playerArmor || 0));
      this.playerHP = Math.max(0, this.playerHP - dmg);
      if (this.playerHP <= 0) this.onPlayerDeath();
    }
    this.enemyMgr.spawnParticles(wx, wy, 0xFF8800, 22);
    this.cameras.main.shake(200, 0.008);
    this.hud.showMsg('MINE DETONATED!', 1500);
  }

  _respawnResources() {
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const node = this.mapData[y]?.[x]?.resource;
        if (!node) continue;
        node.amt = node.maxAmt;
        node.sprite.setVisible(true);
      }
    }
  }

  // ── Cave entrance ─────────────────────────────────────────

  _caveWorldPos() {
    if (!this.caveEntranceTile) return null;
    const { x, y } = this.caveEntranceTile;
    return { x: x * TS + TS / 2, y: y * TS + TS / 2 };
  }

  _updateCaveProximity() {
    const wp = this._caveWorldPos();
    if (!wp || this._caveTransitioning) return;
    const dist = pdist({ x: this.player.x, y: this.player.y }, wp);
    if (dist < TS * 5) {
      this.hud.showMsg('Cave entrance — walk onto it to enter', 600);
    }
    if (dist < TS * 3) {
      this._startCaveTransition();
    }
  }

  _tryCaveEnter() {
    const wp = this._caveWorldPos();
    if (!wp || this._caveTransitioning) return false;
    const dist = pdist({ x: this.player.x, y: this.player.y }, wp);
    if (dist > TS * 2) return false;
    this._startCaveTransition();
    return true;
  }

  _startCaveTransition() {
    this._caveTransitioning = true;

    // Push shared state into registry
    this.registry.set('inventory',       this.inventory);   // object ref — shared
    this.registry.set('playerHP',        this.playerHP);
    this.registry.set('playerMP',        this.playerMP);
    this.registry.set('hasRevive',       this.hasRevive);
    this.registry.set('wave',            this.wave);
    this.registry.set('caveReturnX',     this.player.x);
    this.registry.set('caveReturnY',     this.player.y);
    this.registry.set('hasPickaxe',      this.hasPickaxe);
    this.registry.set('pickaxeKey',      this.pickaxeKey);
    this.registry.set('hasSpeedBoots',   this.hasSpeedBoots);
    this.registry.set('weapon',          this.weapon);
    this.registry.set('bow',             this.bow);
    this.registry.set('armor',           this.armor);
    this.registry.set('helmet',          this.helmet);
    this.registry.set('pants',           this.pants);
    this.registry.set('setBoots',        this.setBoots);
    this.registry.set('playerArmor',     this.playerArmor);
    this.registry.set('playerAttackDmg', this.playerAttackDmg);
    this.registry.set('weaponCooldown',  this._weaponCooldown);
    this.registry.set('waveMgrRef',      this.waveMgr);
    this.registry.set('hasTorch',        this.hasTorch ?? false);
    this.registry.set('isHardcore',      this.isHardcore ?? false);
    this.registry.set('slotId',          this.slotId ?? 1);
    this.registry.set('saveSlotKey',     this.saveSlotKey);
    this.registry.set('relicSys',        this.relicSys);

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.sleep('Game');
      this.scene.launch('Cave');
    });
  }

  _tryDungeonEnter() {
    if (!this.dungeonEntranceTile) return false;
    const { x, y } = this.dungeonEntranceTile;
    const wx = x * TS + TS / 2, wy = y * TS + TS / 2;
    if (Math.hypot(this.player.x - wx, this.player.y - wy) > TS * 2) return false;
    if ((this.inventory.dungeon_key ?? 0) < 1) {
      this.hud.showMsg('Dungeon sealed — you need a Dungeon Key (2% drop from enemies).', 3000);
      return true;
    }
    this.inventory.dungeon_key--;
    this._dungeonOpen = true;
    this.contractSys?.progress('caves_entered', 1);
    this.registry.set('playerHP',        this.playerHP);
    this.registry.set('playerMP',        this.playerMP);
    this.registry.set('inventory',       this.inventory);
    this.registry.set('playerMaxHP',     this.playerMaxHP);
    this.registry.set('playerAttackDmg', this.playerAttackDmg);
    this.registry.set('wave',            this.wave);
    this.registry.set('slotId',          this.slotId);
    this.registry.set('saveSlotKey',     this.saveSlotKey);
    this.registry.set('isHardcore',      this.isHardcore);
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.sleep('Game');
      this.scene.launch('Dungeon', {
        wave: this.wave, slotId: this.slotId,
        saveSlotKey: this.saveSlotKey, isHardcore: this.isHardcore,
        playerHP: this.playerHP, playerMaxHP: this.playerMaxHP,
        playerMP: this.playerMP, playerAttackDmg: this.playerAttackDmg,
        inventory: { ...this.inventory },
      });
    });
    return true;
  }

  _tryMerchantShop() {
    if (!this.merchantSys?.active) return false;
    return this.merchantSys.tryInteract(this.player.x, this.player.y);
  }

  _tryBed() {
    for (const m of this.towerMgr.machines) {
      if (m.key !== 'bed') continue;
      if (pdist({ x: this.player.x, y: this.player.y }, m.sprite) > INTERACT_RANGE) continue;
      this.sleeping = !this.sleeping;
      this._sleepBed = this.sleeping ? m : null;
      if (this.sleeping) {
        this.hud.showMsg('Sleeping — night passes faster. You are still vulnerable!', 3000);
        this.cameras.main.flash(200, 0, 0, 50);
      } else {
        this.hud.showMsg('Woke up.', 1000);
      }
      return true;
    }
    return false;
  }

  _tryAttack() {
    if (this._attackCooldown > 0) return;
    const dmg = this.playerAttackDmg || 0;
    if (dmg <= 0) {
      this.hud.showMsg('Craft a sword to attack! (Items tab)', 2000);
      return;
    }
    const RANGE = 63;
    let hit = false;
    for (const enemy of this.enemyMgr.enemies) {
      if (!enemy.alive) continue;
      if (pdist({ x: this.player.x, y: this.player.y }, enemy.sprite) < RANGE) {
        enemy.hp -= dmg;
        if (enemy.sprite.active) {
          enemy.sprite.setTint(0xFFFFFF);
          this.time.delayedCall(80, () => { if (enemy.sprite?.active) enemy.sprite.clearTint(); });
        }
        hit = true;
      }
    }
    // Also hit cows
    for (const cow of this.cows) {
      if (!cow.alive) continue;
      if (pdist({ x: this.player.x, y: this.player.y }, cow.sprite) < RANGE) {
        cow.hp -= dmg;
        cow.sprite.setTint(0xFF8888);
        this.time.delayedCall(120, () => { if (cow.sprite?.active) cow.sprite.clearTint(); });
        if (cow.hp <= 0) this._killCow(cow);
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
    this.tweens.add({ targets: g, alpha: 0, duration: 150, ease: 'Power2', onComplete: () => g.destroy() });
  }

  // ── Starting walls around spawn ───────────────────────────

  _placeStartingWalls() {
    const cx = Math.floor(MW / 2);
    const cy = Math.floor(MH / 2);
    const r  = 6;   // ring radius in tiles

    // Top and bottom rows — gap at centre tile
    for (let x = cx - r; x <= cx + r; x++) {
      if (x !== cx) {
        this._tryPlaceStartWall(x, cy - r);
        this._tryPlaceStartWall(x, cy + r);
      }
    }
    // Left and right columns — gap at centre tile, no corner duplicates
    for (let y = cy - r + 1; y < cy + r; y++) {
      if (y !== cy) {
        this._tryPlaceStartWall(cx - r, y);
        this._tryPlaceStartWall(cx + r, y);
      }
    }
    // Force a final physics refresh so ALL starting walls are collidable
    this.towerMgr.wallGroup.refresh();
  }

  _tryPlaceStartWall(tx, ty) {
    const cell = this.mapData[ty]?.[tx];
    if (!cell || cell.terrain === 'bwall' || cell.terrain === 'deep' || cell.structure || cell.resource) return;
    this.towerMgr.placeWall('stone', tx, ty);
    // Ensure static body is properly sized for starting walls
    const placed = this.mapData[ty]?.[tx]?.structure;
    if (placed?.sprite?.body) {
      placed.sprite.body.reset(tx * TS + TS / 2, ty * TS + TS / 2);
    }
  }

  // ============================================================
  // NIGHT OVERLAY
  // ============================================================
  _createNightOverlay() {
    this.nightOverlay = this.add.rectangle(VW / 2, VH / 2, VW, VH, 0x0F0A28, 0)
      .setScrollFactor(0).setDepth(30);
  }

  // ============================================================
  // INPUT
  // ============================================================
  _setupInput() {
    this._keys = {
      up:       this.input.keyboard.addKey('W'),
      down:     this.input.keyboard.addKey('S'),
      left:     this.input.keyboard.addKey('A'),
      right:    this.input.keyboard.addKey('D'),
      interact: this.input.keyboard.addKey('E'),
    };
    this._keys.attack     = this.input.keyboard.addKey('L');
    this._keys.perkActive = this.input.keyboard.addKey('Q');

    this.input.keyboard.on('keydown-F', () => {
      if (this.hud.isCraftOpen()) this.hud.closeCraft();
      else                        this.hud.openCraft();
    });

    this.input.keyboard.on('keydown-X', () => this._toggleSellMode());
    this.input.keyboard.on('keydown-BACKTICK', () => this.hud.toggleLabels());

    this.input.on('pointerdown', (ptr) => {
      if (ptr.button === 2) {
        this.buildMode = null;
        if (this.sellMode) this._toggleSellMode();
        return;
      }
      if (ptr.button === 0) {
        if (this.buildMode && (this.time.now - (this._buildModeTime ?? 0)) < 250) return;
        if (this.sellMode)       this._trySell(ptr);
        else if (this.buildMode) this._tryPlace(ptr);
        else                     this._tryAttack();
      }
    });

    this.input.keyboard.on('keydown-ESC', () => this._togglePause());
    this.input.keyboard.on('keydown-TAB', () => this.backpackUI?.toggle());

    // Number keys 1-8: switch craft tabs when open, else 1-4 = hotbar consumables
    const NUM_KEYS = ['ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT'];
    NUM_KEYS.forEach((code, i) => {
      this.input.keyboard.on(`keydown-${code}`, () => {
        if (this.hud.isCraftOpen()) {
          this.hud._selectTab(i);
          this._gamepadMenuIdx = 0;
          this._gamepadTabIdx  = i;
        } else {
          // Hotbar: 1=eat, 2=soul_bomb, 3=iron_ration, 4=blood_pact, 5=temporal_shard
          const hotbarActions = [
            () => this._tryCampfire(),
            () => this._useSoulBomb(),
            () => this._useIronRation(),
            () => this._useBloodPact(),
            () => this._useTemporalShard(),
          ];
          hotbarActions[i]?.();
        }
      });
    });

    // Arrow keys: navigate craft slots when open
    this.input.keyboard.on('keydown-UP',    () => { if (this.hud.isCraftOpen()) { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 4); this.hud._selectSlot(this._gamepadMenuIdx); } });
    this.input.keyboard.on('keydown-DOWN',  () => { if (this.hud.isCraftOpen()) { this._gamepadMenuIdx = Math.min(19, this._gamepadMenuIdx + 4); this.hud._selectSlot(this._gamepadMenuIdx); } });
    this.input.keyboard.on('keydown-LEFT',  () => { if (this.hud.isCraftOpen()) { this._gamepadMenuIdx = Math.max(0,  this._gamepadMenuIdx - 1); this.hud._selectSlot(this._gamepadMenuIdx); } });
    this.input.keyboard.on('keydown-RIGHT', () => { if (this.hud.isCraftOpen()) { this._gamepadMenuIdx = Math.min(19, this._gamepadMenuIdx + 1); this.hud._selectSlot(this._gamepadMenuIdx); } });
    // Enter: confirm highlighted slot
    this.input.keyboard.on('keydown-ENTER', () => { if (this.hud.isCraftOpen()) this.hud._onSlotClick(this._gamepadMenuIdx); });
  }

  // ============================================================
  // GAMEPAD INPUT
  // ============================================================
  _setupGamepad() {
    this._gpPrev         = {};
    this._gamepadMenuIdx = 0;
    this._gamepadTabIdx  = 0;
    this._gpDetected     = false;
    this._gpCursorX      = VW / 2;
    this._gpCursorY      = VH / 2;

    // Crosshair cursor drawn at (0,0), repositioned every frame
    const g = this.add.graphics().setScrollFactor(0).setDepth(200).setVisible(false);
    g.lineStyle(1.5, 0xFFFFFF, 0.9);
    g.strokeCircle(0, 0, 7);
    g.lineBetween(-12, 0, -9, 0);
    g.lineBetween(9, 0, 12, 0);
    g.lineBetween(0, -12, 0, -9);
    g.lineBetween(0, 9, 0, 12);
    this._gpCursorGfx = g;

    this.input.gamepad.on('connected', () => {
      this._gpDetected = true;
      this._gpCursorGfx.setVisible(true);
      this.hud?.showMsg('Controller ready!  RT=click cursor  B=craft  Y=sell  X=attack', 4000);
    });
    this.input.gamepad.on('disconnected', () => {
      this._gpDetected = false;
      this._gpCursorGfx.setVisible(false);
      this.hud?.showMsg('Controller disconnected.', 2000);
    });
  }

  // ============================================================
  // SELL MODE
  // ============================================================
  _toggleSellMode() {
    this.sellMode = !this.sellMode;
    this.buildMode = null;
    if (this.hud.isCraftOpen()) this.hud.closeCraft();
    if (this.sellMode) this.hud.showMsg('SELL MODE — click a structure (50 % refund) | X or right-click to cancel', 5000);
    else               this.hud.showMsg('Sell mode cancelled.', 1000);
    this.hud.setSellMode(this.sellMode);
  }

  _togglePause() {
    if (!this._pauseMenu) this._buildPauseMenu();
    this._paused = !this._paused;
    this._pauseMenu.forEach(i => i.setVisible(this._paused));
    if (this._paused) {
      this.physics.pause();
      if (this.hud.isCraftOpen()) this.hud.closeCraft();
      this.buildMode = null;
      if (this.sellMode) this._toggleSellMode();
    } else {
      this.physics.resume();
    }
  }

  _buildPauseMenu() {
    const cx = VW / 2, cy = VH / 2;
    const d = 100;
    const items = [];
    items.push(this.add.rectangle(cx, cy, VW, VH, 0x000000, 0.65).setScrollFactor(0).setDepth(d));
    items.push(this.add.rectangle(cx, cy, 300, 240, 0x0F0A08).setStrokeStyle(2, 0x5A4030).setScrollFactor(0).setDepth(d));
    items.push(this.add.text(cx, cy - 90, 'PAUSED', {
      fontSize: '22px', fill: '#EDE0C4', fontFamily: 'monospace',
      stroke: '#3D2B1F', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 1));
    const mkBtn = (y, label, cb) => {
      const b = this.add.text(cx, y, label, {
        fontSize: '15px', fill: '#C8A96E', fontFamily: 'monospace',
        backgroundColor: '#1A1210', padding: { x: 20, y: 10 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(d + 1).setInteractive({ useHandCursor: true });
      b.on('pointerover',  () => b.setStyle({ fill: '#FFE090' }));
      b.on('pointerout',   () => b.setStyle({ fill: '#C8A96E' }));
      b.on('pointerdown',  cb);
      items.push(b);
    };
    mkBtn(cy - 25, '[ RESUME ]',        () => this._togglePause());
    mkBtn(cy + 25, '[ CODEX ]',         () => {
      // Hide pause menu and sleep Game so state is fully preserved while Codex is open
      this._paused = false;
      this._pauseMenu?.forEach(i => i.setVisible(false));
      this.physics.resume();
      this._codexOpen = true;
      this.scene.sleep('Game');
      this.scene.launch('Help', { returnTo: 'Game', slotId: this.slotId, hardcore: this.isHardcore });
    });
    mkBtn(cy + 75, '[ SAVE  &  QUIT ]', () => { this.saveGame(); this.scene.start('Menu'); });
    items.forEach(i => i.setVisible(false));
    this._pauseMenu = items;
  }

  _trySell(ptr) {
    const cam = this.cameras.main;
    const tx  = Math.floor((cam.scrollX + ptr.x) / TS);
    const ty  = Math.floor((cam.scrollY + ptr.y) / TS);
    const result = this.towerMgr.sellStructure(tx, ty);
    if (result) {
      const refundStr = Object.entries(result.refund).map(([r, n]) => `+${n} ${r}`).join(', ');
      this.hud.showMsg(`Sold ${result.name} — ${refundStr}`, 2000);
    } else {
      this.hud.showMsg('Nothing to sell here.', 1000);
    }
  }

  // ============================================================
  // PLACEMENT
  // ============================================================
  _tryPlace(ptr) {
    const cam = this.cameras.main;
    const wx  = cam.scrollX + ptr.x;
    const wy  = cam.scrollY + ptr.y;
    const tx  = Math.floor(wx / TS);
    const ty  = Math.floor(wy / TS);
    if (tx < 1 || ty < 1 || tx >= MW - 1 || ty >= MH - 1) return;
    if (this.challengeMods?.no_towers && (this.buildMode?.cat === 'tower' || this.buildMode?.cat === 'wall')) {
      this.hud.showMsg('No Towers mode — towers and walls cannot be placed!', 2000);
      return;
    }
    const cell = this.mapData[ty]?.[tx];
    if (!cell) return;
    if (cell.terrain === 'bwall') { this.hud.showMsg('Cannot build on boundary wall.', 1200); return; }
    if (cell.resource)            { this.hud.showMsg('Harvest the resource first.',     1200); return; }
    // Allow replacing a wall with a higher-tier (more HP) wall
    if (cell.structure) {
      const existing = cell.structure;
      const { cat, key, def } = this.buildMode;
      if (cat === 'wall' && existing.type && WALL_DEFS[existing.type] && WALL_DEFS[key]) {
        if (WALL_DEFS[key].hp > WALL_DEFS[existing.type].hp) {
          const inv = this.inventory;
          if (!Object.entries(def.cost).every(([r, n]) => (inv[r] || 0) >= n)) {
            this.hud.showMsg('Not enough resources!', 1500);
            return;
          }
          Object.entries(def.cost).forEach(([r, n]) => inv[r] -= n);
          this.towerMgr.removeWall(existing);
          this.towerMgr.placeWall(key, tx, ty);
          this.hud.showMsg(`${def.name} placed (upgraded).`, 900);
          return;
        }
        this.hud.showMsg('Can only replace with a stronger wall.', 1200);
        return;
      }
      this.hud.showMsg('Tile already occupied.', 1200);
      return;
    }
    const { cat, key, def } = this.buildMode;
    const inv = this.inventory;

    // Bridge — placed on river tiles only
    if (key === 'bridge') {
      if (cell.terrain !== 'river') { this.hud.showMsg('Bridges can only be placed on river tiles.', 1500); return; }
      if (!(this.inventory.bridge_blueprint > 0)) { this.hud.showMsg('Bridge Blueprint needed — defend supply crates to find one!', 2000); return; }
      if (!Object.entries(def.cost).every(([r, n]) => (inv[r] || 0) >= n)) {
        this.hud.showMsg('Not enough resources! Bridge costs 200 wood + 100 stone.', 1500); return;
      }
      Object.entries(def.cost).forEach(([r, n]) => { inv[r] -= n; });
      const blocker = this.riverBodies?.[`${tx},${ty}`];
      if (blocker) { blocker.destroy(); delete this.riverBodies[`${tx},${ty}`]; }
      this.mapData[ty][tx].terrain = 'bridge';
      this.add.sprite(tx * TS + TS / 2, ty * TS + TS / 2, 'bridge').setDepth(1);
      this._bridges.push({ tx, ty });
      soundMgr.build();
      this.hud.showMsg('Bridge built! River crossing complete.', 2000);
      return;
    }

    // Traps don't occupy structure slots — place directly
    if (cat === 'trap') {
      if (!Object.entries(def.cost).every(([r, n]) => (inv[r] || 0) >= n)) {
        this.hud.showMsg('Not enough resources!', 1500);
        return;
      }
      Object.entries(def.cost).forEach(([r, n]) => inv[r] -= n);
      const sp = this.add.sprite(tx * TS + TS / 2, ty * TS + TS / 2, def.tex).setDepth(2).setAlpha(0.85);
      this.traps.push({ type: key, wx: tx * TS + TS / 2, wy: ty * TS + TS / 2, grid: { x: tx, y: ty }, alive: true, sprite: sp });
      this.hud.showMsg(`${def.name} placed.`, 900);
      return;
    }

    if (!Object.entries(def.cost).every(([r, n]) => (inv[r] || 0) >= n)) {
      this.hud.showMsg('Not enough resources!', 1500);
      return;
    }
    Object.entries(def.cost).forEach(([r, n]) => inv[r] -= n);
    if      (cat === 'tower' || cat === 'cursed_tower')   {
      this.towerMgr.placeTower(key, tx, ty);
      // Cursed tile — player claims it with a black-tint tower (attacks enemies, 2× dmg / ½ HP)
      if (this.cursedTiles.has(`${tx},${ty}`)) {
        const tower = this.mapData[ty]?.[tx]?.structure;
        if (tower && !tower.corrupted) {
          tower._playerCursed = true;
          tower.dmgMult       = 2;
          tower.maxHp         = Math.round(tower.maxHp * 0.5);
          tower.hp            = tower.maxHp;
          tower.sprite.setTint(0x110033);  // BLACK tint = your cursed tower, attacks enemies
          this.hud.showMsg(`${def.name} claims the cursed ground — BLACK tint = YOUR tower (2× dmg / ½ HP, attacks enemies)!`, 4000);
          return;
        }
      }
    }
    else if (cat === 'machine') this.towerMgr.placeMachine(key, tx, ty, def);
    else if (cat === 'wall')    this.towerMgr.placeWall(key, tx, ty);
    soundMgr.build();
    this.hud.showMsg(`${def.name} placed.`, 900);
  }

  // ============================================================
  // PLAYER DEATH
  // ============================================================
  onPlayerDeath() {
    if (this.hasRevive) {
      this.hasRevive  = false;
      this.playerHP   = this.playerMaxHP;
      this.invincible = 3000;
      this.cameras.main.flash(400, 255, 255, 100);
      soundMgr.play('revive');
      this.enemyMgr?.spawnParticles(this.player.x, this.player.y, 0xFFD700, 20);
      this.events?.emit('achievement_check', 'revive_used');
      this.hud.showMsg('Revive Token used — 3s invincibility!', 3000);
      return;
    }
    // Notify multiplayer partner
    if (this.multiplayer && this._mp) {
      this._mp.sendDeath();
    }
    // Bank souls into meta progression before deleting save
    metaProgression.addSoulsFromRun(this.inventory.souls || 0);
    // Delete the save immediately — no reloading to cheat death
    try { localStorage.removeItem(this.saveSlotKey); } catch (_) {}
    this.alive = false;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameOver', { wave: this.wave, slotId: this.slotId, deathCause: this._lastDamageSource });
    });
  }

  // ── Consumable effects ────────────────────────────────────
  _useSoulBomb() {
    if ((this.inventory.soul_bomb ?? 0) < 1) return;
    this.inventory.soul_bomb--;
    const r = CONSUMABLE_DEFS.soul_bomb.radius;
    let killed = 0;
    for (const e of (this.enemyMgr?.enemies ?? [])) {
      if (!e.alive) continue;
      if (Math.hypot(e.sprite.x - this.player.x, e.sprite.y - this.player.y) < r) {
        e.hp = 0;
        killed++;
      }
    }
    this.enemyMgr?.spawnParticles(this.player.x, this.player.y, 0xFF00FF, 30);
    this.hud.showMsg(`Soul Bomb! ${killed} enemies destroyed.`, 2500);
    soundMgr.play('bossDie');
  }

  _useIronRation() {
    if ((this.inventory.iron_ration ?? 0) < 1) return;
    this.inventory.iron_ration--;
    const boost = CONSUMABLE_DEFS.iron_ration.armorBoost;
    const dur   = CONSUMABLE_DEFS.iron_ration.duration;
    this._ironRationBoost = (this._ironRationBoost ?? 0) + boost;
    this.playerArmor += boost;
    this.hud.showMsg(`Iron Ration: +${boost} armor for 30s`, 2500);
    this.time.delayedCall(dur, () => {
      this._ironRationBoost = (this._ironRationBoost ?? boost) - boost;
      this.playerArmor = Math.max(0, this.playerArmor - boost);
    });
  }

  _useBloodPact() {
    if ((this.inventory.blood_pact ?? 0) < 1) return;
    const hpCost = CONSUMABLE_DEFS.blood_pact.hpCost;
    if (this.playerHP <= hpCost) { this.hud.showMsg('Not enough HP for Blood Pact!', 1500); return; }
    this.inventory.blood_pact--;
    this.playerHP -= hpCost;
    const mult = CONSUMABLE_DEFS.blood_pact.dmgMult;
    const dur  = CONSUMABLE_DEFS.blood_pact.duration;
    const prev = this.playerAttackDmg;
    this.playerAttackDmg = Math.floor(this.playerAttackDmg * mult);
    this.hud.showMsg(`Blood Pact: triple damage for 10s! (cost: ${hpCost} HP)`, 2500);
    this.cameras.main.flash(300, 200, 0, 0);
    this.time.delayedCall(dur, () => { this.playerAttackDmg = prev; });
  }

  _useTemporalShard() {
    if ((this.inventory.temporal_shard ?? 0) < 1) return;
    this.inventory.temporal_shard--;
    const dur = CONSUMABLE_DEFS.temporal_shard.duration;
    for (const e of (this.enemyMgr?.enemies ?? [])) {
      if (!e.alive) continue;
      e.slow      = 0;
      e.slowTimer = dur;
      e.frozen    = true; e.frozenTimer = dur;
      if (e.sprite?.active) e.sprite.setTint(0x88EEFF);
      this.time.delayedCall(dur, () => { if (e.sprite?.active) e.sprite.clearTint(); });
    }
    this.enemyMgr?.spawnParticles(this.player.x, this.player.y, 0x44DDFF, 25);
    this.hud.showMsg('Temporal Shard: all enemies frozen for 5s!', 2500);
  }

  // ============================================================
  // SAVE / LOAD
  // ============================================================
  saveGame() {
    const save = {
      seed:            this.seed,
      wave:            this.wave,
      hp:              this.playerHP,
      mp:              this.playerMP,
      playerMaxHP:     this.playerMaxHP,
      inventory:       { ...this.inventory },
      hasRevive:       this.hasRevive,
      px:              this.player.x,
      py:              this.player.y,
      caveEntrance:    this.caveEntranceTile,
      phase:           this.waveMgr.serialize(),
      hasPickaxe:      this.hasPickaxe,
      pickaxeKey:      this.pickaxeKey,
      hasSpeedBoots:   this.hasSpeedBoots,
      weapon:          this.weapon,
      bow:             this.bow,
      armor:           this.armor,
      helmet:          this.helmet,
      pants:           this.pants,
      setBoots:        this.setBoots,
      playerArmor:     this.playerArmor,
      playerAttackDmg: this.playerAttackDmg,
      weaponCooldown:  this._weaponCooldown,
      sleeping:        false,
      isHardcore:      this.isHardcore,
      hasTorch:        this.hasTorch,
      bossKillCount:   this.bossKillCount,
      bossBuff:        { ...this.bossBuff },
      mapTheme:        this.mapTheme,
      perks:           this.perkSys?.serialize(),
      relics:          this.relicSys?.serialize(),
      playerLevel:     this.playerLevelSys?.serialize(),
      contracts:       this.contractSys?.serialize(),
      challengeMods:   this.challengeMods ?? {},
      chests:          (this.chests || []).map(c => ({ type: c.type, tx: c.tx, ty: c.ty, isOpen: c.isOpen })),
      bridges:         (this._bridges || []).map(b => ({ tx: b.tx, ty: b.ty })),
      ...this.towerMgr.serialize(),
    };
    localStorage.setItem(this.saveSlotKey, JSON.stringify(save));
  }

  _loadSave() {
    const raw = localStorage.getItem(this.saveSlotKey);
    if (!raw) return false;
    try {
      const s = JSON.parse(raw);
      // seed already applied before map generation — don't overwrite here
      this.wave             = s.wave      ?? 0;
      this.playerHP         = s.hp        ?? 100;
      this.playerMP         = s.mp        ?? 100;
      this.playerMaxHP      = s.playerMaxHP ?? 100;
      this.inventory        = s.inventory ?? this.inventory;
      this.hasRevive        = s.hasRevive ?? false;
      if (s.px) this.player.x = s.px;
      if (s.py) this.player.y = s.py;
      // caveEntranceTile set by mapGen.generate() with the correct seed — don't overwrite
      this.towerMgr.restore(s, s.phase?.isDay ?? true);
      this.waveMgr.restore(s.phase ?? { isDay: true, phaseTime: 0 });
      this.hasPickaxe      = s.hasPickaxe      ?? false;
      this.pickaxeKey      = s.pickaxeKey      ?? null;
      this.hasSpeedBoots   = s.hasSpeedBoots   ?? false;
      this.weapon          = s.weapon          ?? null;
      this.bow             = s.bow             ?? null;
      this.armor           = s.armor           ?? null;
      this.helmet          = s.helmet          ?? null;
      this.pants           = s.pants           ?? null;
      this.setBoots        = s.setBoots        ?? null;
      this.playerArmor     = s.playerArmor     ?? 0;
      this.playerAttackDmg = s.playerAttackDmg ?? 10;
      this._weaponCooldown = s.weaponCooldown  ?? 400;
      // Ensure new resource fields exist in older saves
      this.inventory.ruby       = this.inventory.ruby       ?? 0;
      this.inventory.emerald    = this.inventory.emerald    ?? 0;
      this.inventory.raw_meat   = this.inventory.raw_meat   ?? 0;
      this.inventory.cooked_meat = this.inventory.cooked_meat ?? 0;
      this.isHardcore    = s.isHardcore ?? false;
      this.hasTorch      = s.hasTorch   ?? false;
      this.bossKillCount = s.bossKillCount ?? 0;
      this.bossBuff      = s.bossBuff ?? { hpMult: 1.0, dmgMult: 1.0, countMult: 1.0 };
      // Ensure key slots exist for older saves
      this.inventory.key_regular      = this.inventory.key_regular      ?? 0;
      this.inventory.key_boss         = this.inventory.key_boss         ?? 0;
      this.inventory.cursed_essence   = this.inventory.cursed_essence   ?? 0;
      this.inventory.void_shards      = this.inventory.void_shards      ?? 0;
      this.inventory.corrupted_wood   = this.inventory.corrupted_wood   ?? 0;
      this.inventory.corrupted_stone  = this.inventory.corrupted_stone  ?? 0;
      this.inventory.uncurse_token    = this.inventory.uncurse_token    ?? 0;
      this.inventory.bridge_blueprint = this.inventory.bridge_blueprint ?? 0;
      // Restore perks (mapTheme already loaded before generate())
      if (s.perks)        this.perkSys?.restore(s.perks);
      if (s.relics)       this.relicSys?.restore(s.relics);
      if (s.playerLevel)  this.playerLevelSys?.restore(s.playerLevel);
      if (s.contracts)    this.contractSys?.restore(s.contracts);
      if (s.challengeMods) this.challengeMods = s.challengeMods;
      this.inventory.dungeon_key    = this.inventory.dungeon_key    ?? 0;
      this.inventory.soul_bomb      = this.inventory.soul_bomb      ?? 0;
      this.inventory.iron_ration    = this.inventory.iron_ration    ?? 0;
      this.inventory.blood_pact     = this.inventory.blood_pact     ?? 0;
      this.inventory.temporal_shard = this.inventory.temporal_shard ?? 0;
      // Mark chests that were already opened
      if (s.chests && this.chests) {
        for (const saved of s.chests) {
          const chest = this.chests.find(c => c.tx === saved.tx && c.ty === saved.ty);
          if (chest && saved.isOpen && !chest.isOpen) {
            chest.isOpen = true;
            chest.sprite.setTexture('chest_open');
            if (chest.label) chest.label.setVisible(false);
          }
        }
      }
      // Restore bridges
      if (s.bridges && Array.isArray(s.bridges)) {
        for (const b of s.bridges) {
          const { tx, ty } = b;
          if (this.mapData[ty]?.[tx]) {
            this.mapData[ty][tx].terrain = 'bridge';
            this.add.sprite(tx * TS + TS / 2, ty * TS + TS / 2, 'bridge').setDepth(1);
            const blocker = this.riverBodies?.[`${tx},${ty}`];
            if (blocker) { blocker.destroy(); delete this.riverBodies[`${tx},${ty}`]; }
            this._bridges.push({ tx, ty });
          }
        }
      }
      this.applyArmorTint(this.armor);
      // Recalculate total armor from all equipped pieces
      this.hud?._recalcArmor?.();
      return true;
    } catch (e) {
      console.warn('Save load failed:', e);
      return false;
    }
  }
}
